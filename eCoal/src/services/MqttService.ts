import mqtt from "mqtt";
import { sensorMappings, temperatureControlMappings } from "../config/sensors";
import t from "../i18n/t";
import type { Config, CustomMapping, ECoalResponse } from "../types";
import { logger } from "../utils/logger";

export class MqttService {
  private mqttClient!: mqtt.MqttClient;
  private config: Config;
  private mappings: CustomMapping[];
  private deviceId: string;
  private setECoalValue: (parameter: string, value: string) => Promise<boolean>;

  constructor(
    config: Config,
    mappings: CustomMapping[],
    deviceId: string,
    setECoalValue: (parameter: string, value: string) => Promise<boolean>,
  ) {
    this.config = config;
    this.deviceId = deviceId;
    this.setECoalValue = setECoalValue;
    this.mappings = mappings;
  }

  connect(): void {
    const mqttUrl = `mqtt://${this.config.mqtt_broker}:${this.config.mqtt_port}`;
    const options: mqtt.IClientOptions = {};

    if (this.config.mqtt_username) {
      options.username = this.config.mqtt_username;
      options.password = this.config.mqtt_password;
    }

    this.mqttClient = mqtt.connect(mqttUrl, options);

    this.mqttClient.on("connect", () => {
      logger.info(`Connected to MQTT broker at ${mqttUrl}`);
      this.publishDiscoveryConfigs();
      this.subscribeToCommands();
    });

    this.mqttClient.on("error", (error) => {
      logger.error("MQTT connection error:", error);
    });

    this.mqttClient.on("message", (topic, message) => {
      this.handleMqttMessage(topic, message.toString());
    });
  }

  publishSensorData(data: ECoalResponse): void {
    if (!this.mqttClient || !this.mqttClient.connected) {
      return;
    }

    sensorMappings.forEach((sensor) => {
      const register = data.cmd.device.reg.find((r) => r.tid === sensor.tid);

      if (register) {
        const value = register.v;
        const stateTopic = `${this.config.mqtt_topic_prefix}/sensor/${this.deviceId}/${sensor.mqttUniqueId}/state`;

        if (value) {
          this.mqttClient.publish(stateTopic, value);
          logger.debug(
            `Published sensor data: ${sensor.mqttUniqueId} = ${value}`,
          );
        }
      }
    });

    const autoModeValue = data.cmd.device.reg.find(
      (r) => r.tid === "tryb_auto_state",
    )?.v;

    if (autoModeValue) {
      const stateTopic = `${this.config.mqtt_topic_prefix}/switch/${this.deviceId}/auto_mode/state`;
      this.mqttClient.publish(stateTopic, autoModeValue === "1" ? "ON" : "OFF");
    }

    temperatureControlMappings.forEach((config) => {
      const register = data.cmd.device.reg.find(
        (r) => r.tid === config.currentSetValueId,
      );

      if (register?.v) {
        const stateTopic = `${this.config.mqtt_topic_prefix}/number/${this.deviceId}/${config.mqttUniqueId}/state`;

        this.mqttClient.publish(stateTopic, register.v);

        logger.debug(
          `Published number data: ${config.mqttUniqueId} = ${register.v}`,
        );
      }
    });
  }

  publishCustomEntries(data: { id: string; value: number | null }[]): void {
    if (!this.mqttClient || !this.mqttClient.connected) {
      return;
    }

    data.forEach((sensor) => {
      const name = this.mappings.find(
        (mapping) => mapping.id === sensor.id,
      )?.name;

      if (!name) {
        logger.warn(`No mapping found for sensor ${sensor.id}`);
        return;
      }

      const stateTopic = `${this.config.mqtt_topic_prefix}/sensor/${this.deviceId}/custom_${sensor.id}/state`;

      if (sensor.value) {
        this.mqttClient.publish(stateTopic, sensor.value.toString());

        logger.debug(
          `Published sensor data: custom_${sensor.id} = ${sensor.value}`,
        );
      }
    });
  }

  isConnected(): boolean {
    return this.mqttClient?.connected || false;
  }

  private publishDiscoveryConfigs(): void {
    sensorMappings.forEach((sensor) => {
      const discoveryTopic = `${this.config.mqtt_topic_prefix}/sensor/${this.deviceId}/${sensor.mqttUniqueId}/config`;
      const stateTopic = `${this.config.mqtt_topic_prefix}/sensor/${this.deviceId}/${sensor.mqttUniqueId}/state`;

      const config = {
        name: t(sensor.name),
        unique_id: `${this.deviceId}_${sensor.mqttUniqueId}`,
        state_topic: stateTopic,
        unit_of_measurement: sensor.unit,
        device_class: sensor.type === "temp" ? "temperature" : undefined,
        state_class: sensor.type === "temp" ? "measurement" : undefined,
        icon:
          sensor.type === "temp"
            ? "mdi:thermometer"
            : sensor.type === "percentage"
              ? "mdi:percent"
              : sensor.type === "state"
                ? "mdi:toggle-switch"
                : "mdi:gauge",
        device: {
          identifiers: [this.deviceId],
          name: this.config.device_name,
          model: "eCoal Controller",
          manufacturer: "eCoal",
        },
      };

      this.mqttClient.publish(discoveryTopic, JSON.stringify(config), {
        retain: true,
      });
    });

    const switchConfig = {
      name: t("auto_mode"),
      unique_id: `${this.deviceId}_auto_mode`,
      state_topic: `${this.config.mqtt_topic_prefix}/switch/${this.deviceId}/auto_mode/state`,
      command_topic: `${this.config.mqtt_topic_prefix}/switch/${this.deviceId}/auto_mode/set`,
      icon: "mdi:auto-mode",
      device: {
        identifiers: [this.deviceId],
        name: this.config.device_name,
        model: "eCoal Controller",
        manufacturer: "eCoal",
      },
    };

    this.mqttClient.publish(
      `${this.config.mqtt_topic_prefix}/switch/${this.deviceId}/auto_mode/config`,
      JSON.stringify(switchConfig),
      { retain: true },
    );

    temperatureControlMappings.forEach((config) => {
      const numberDiscoveryTopic = `${this.config.mqtt_topic_prefix}/number/${this.deviceId}/${config.mqttUniqueId}/config`;
      const numberStateTopic = `${this.config.mqtt_topic_prefix}/number/${this.deviceId}/${config.mqttUniqueId}/state`;
      const numberCommandTopic = `${this.config.mqtt_topic_prefix}/number/${this.deviceId}/${config.mqttUniqueId}/set`;

      const numberConfig = {
        name: t(config.name),
        unique_id: `${this.deviceId}_${config.mqttUniqueId}`,
        state_topic: numberStateTopic,
        command_topic: numberCommandTopic,
        unit_of_measurement: config.unit,
        icon: "mdi:thermometer-plus",
        min: config.minValue,
        max: config.maxValue,
        mode: "box",
        device: {
          identifiers: [this.deviceId],
          name: this.config.device_name,
          manufacturer: "eCoal",
          model: "Furnace Controller",
        },
      };

      this.mqttClient.publish(
        numberDiscoveryTopic,
        JSON.stringify(numberConfig),
        { retain: true },
      );
    });

    logger.info("Published MQTT discovery configurations");
  }

  private subscribeToCommands(): void {
    const commandTopic = `${this.config.mqtt_topic_prefix}/switch/${this.deviceId}/auto_mode/set`;
    this.mqttClient.subscribe(commandTopic);

    temperatureControlMappings.forEach((config) => {
      const numberTopic = `${this.config.mqtt_topic_prefix}/number/${this.deviceId}/${config.mqttUniqueId}/set`;
      this.mqttClient.subscribe(numberTopic);
    });

    logger.info(
      `Subscribed to command topics: ${commandTopic} and number control topics`,
    );
  }

  private async handleMqttMessage(
    topic: string,
    message: string,
  ): Promise<void> {
    logger.debug(`Received MQTT message on ${topic}: ${message}`);

    if (topic.includes("/auto_mode/set")) {
      const autoMode = message.toLowerCase() === "on" ? "1" : "0";
      const success = await this.setECoalValue("tryb_auto", autoMode);

      if (success) {
        const stateTopic = `${this.config.mqtt_topic_prefix}/switch/${this.deviceId}/auto_mode/state`;
        this.mqttClient.publish(stateTopic, message.toUpperCase());
      }
    } else if (topic.includes("/number/")) {
      const numberConfig = temperatureControlMappings.find((config) =>
        topic.includes(`/${config.mqttUniqueId}/set`),
      );

      if (numberConfig) {
        const temperature = parseFloat(message);
        if (
          !isNaN(temperature) &&
          temperature >= (numberConfig.minValue || 0) &&
          temperature <= (numberConfig.maxValue || 100)
        ) {
          const success = await this.setECoalValue(
            numberConfig.setId,
            temperature.toString(),
          );

          if (success) {
            const stateTopic = `${this.config.mqtt_topic_prefix}/number/${this.deviceId}/${numberConfig.mqttUniqueId}/state`;
            this.mqttClient.publish(stateTopic, message);
            logger.info(
              `Set ${numberConfig.mqttUniqueId} to ${temperature}°C via MQTT`,
            );
          }
        } else {
          logger.warn(
            `Invalid temperature value: ${message} for ${numberConfig.mqttUniqueId}`,
          );
        }
      }
    }
  }
}
