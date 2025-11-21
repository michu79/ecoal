import type { Config } from "../types";
import { logger } from "../utils/logger";

class ConfigService {
  private config!: Config;

  async loadConfig(): Promise<Config> {
    try {
      const configData = await Bun.file("/data/options.json").text();

      this.config = JSON.parse(configData);

      logger.info("Configuration loaded successfully");
      logger.info(
        `Device: ${this.config.device_name} at ${this.config.ecoal_host}`,
      );

      return this.config;
    } catch (error) {
      logger.error("Failed to load configuration:", error);
      logger.info("Trying ./data/options.json");

      try {
        const configData = await Bun.file("./data/options.json").text();

        this.config = JSON.parse(configData);

        logger.info("Configuration loaded successfully");
        logger.info(
          `Device: ${this.config.device_name} at ${this.config.ecoal_host}`,
        );

        return this.config;
      } catch (e) {
        logger.error("Failed to load configuration:", error);
        throw e;
      }

      throw error;
    }
  }

  getConfig(): Config {
    if (!this.config) {
      throw new Error("Configuration not loaded. Call loadConfig() first.");
    }

    return this.config;
  }

  getDeviceId(): string {
    return this.getConfig().device_name.toLowerCase().replace(/\s+/g, "_");
  }
}

export const configService = new ConfigService();
