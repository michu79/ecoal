import { configService } from "./services/ConfigService";
import { ECoalService } from "./services/ECoalService";
import { MqttService } from "./services/MqttService";
import { logger, setLogLevel } from "./utils/logger";

await configService.loadConfig();

try {
  logger.info("Loading configuration...");

  const config = configService.getConfig();

  setLogLevel(config.log_level);

  logger.info("Loading services...");

  const ecoalService = new ECoalService(config);

  const mqttService = new MqttService(
    config,
    configService.getDeviceId(),
    (parameter: string, value: string) =>
      ecoalService.setValue(parameter, value),
  );

  logger.info("Connecting to MQTT broker...");

  mqttService.connect();

  const interval = Math.max(10, config.poll_interval);

  async function pollECoalData(): Promise<void> {
    logger.debug("Polling eCoal data...");

    const data = await ecoalService.fetchData();

    if (data) {
      if (mqttService.isConnected()) {
        try {
          mqttService.publishSensorData(data);
        } catch (error) {
          logger.error("Error publishing sensor data:", error);
          logger.error("Got data:");
          console.log(JSON.stringify(data, null, 2));

          throw new Error("Failed to publish sensor data");
        }
      }

      logger.debug("eCoal data updated successfully");
    } else {
      logger.warn("Failed to fetch eCoal data");
    }
  }

  pollECoalData();

  setInterval(() => {
    pollECoalData().catch((error) => {
      logger.error("Error in polling task:", error);
    });
  }, interval * 1000);

  logger.info(`Polling scheduled every ${interval} seconds`);

  logger.info("eCoal Controller started successfully");
} catch (error) {
  logger.error("Failed to start eCoal Controller:", error);
  process.exit(1);
}
