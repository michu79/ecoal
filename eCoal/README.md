# MQTT based eCoal Furnace Controller

## About

This addon provides a MQTT topic for controlling eCoal furnaces (only version 3.5). There are no official integrations for this specific version of the eCoal furnace, so I decided to create one. It uses the API exposed by the controller to control the furnace. There was no official spec for the API, so the communication is based on reverse engineering the API calls made by the eCoal app.

## Integration

I decided to make this an addon instead of an integration because I'm not a python dev. If someone wants to create an integration, feel free to use this repo as a reference.

## Pre-requisites

- Hassio
- [MQTT integration](https://www.home-assistant.io/integrations/mqtt/)
- MQTT broker (e.g. Mosquitto)

## Installation in Home Assistant

1. Add the repository URL `https://github.com/MT-ZD/ecoal_controller` to your Home Assistant OS Addons 
2. Install the addon
3. Configure the addon with your eCoal furnace credentials and IP, language, and MQTT broker settings.
4. Restart the addon.
5. The entities should be available in your MQTT integration.

## Supported languages

- English (en)
- Polish (pl)

## Development

### Tech stack

- Node.js v24
- Docker

### Setup

1. Create dev `./data/options.json` file. Here is an example:

```json
{
  "ecoal_host": "192.168.0.100",
  "ecoal_username": "root",
  "ecoal_password": "root",
  "mqtt_broker": "localhost",
  "mqtt_port": 1883,
  "mqtt_username": "admin",
  "mqtt_password": "password",
  "mqtt_topic_prefix": "homeassistant",
  "device_name": "eCoal Furnace",
  "poll_interval": 30,
  "log_level": "info",
  "entity_language": "en",
  "tempMappings": "1@temp=\"Temp czujnik. 1\";2@vtemp=\"Temp czujnik. 2\"",
  "vtempMappings": "21@vtemp=\"Temp. głowica 1\";22@vtemp=\"Temp. głowica 2\""
}
```

2. Start a development MQTT broker by running `docker compose up` in the `dev-broker` directory.

3. Connect to the broker with MQTT client.

4. Start the development server by running `bun dev` in the root directory.
