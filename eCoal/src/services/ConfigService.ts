import { readFileSync } from "node:fs";
import type { Config, CustomMapping } from "../types";
import { logger } from "../utils/logger";

class ConfigService {
  private config!: Config;

  async loadConfig(): Promise<Config> {
    try {
      const configData = readFileSync("/data/options.json", "utf8");

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
        const configData = readFileSync("./data/options.json", "utf8");

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
    }
  }

  getConfig(): Config {
    if (!this.config) {
      throw new Error("Configuration not loaded. Call loadConfig() first.");
    }

    return this.config;
  }

  getMappings(): CustomMapping[] {
    const tempMappings = this.config.tempMappings
      ? this.config.tempMappings.split(";").map((entry) => {
          const [id, name] = entry.split("=");
          const [vid, tid] = id!.split("@");

          return {
            id: id!,
            vid: vid!,
            tid: tid!,
            name: name!.replace(/"/g, ""),
            safeId: id!.replace("@", "_"),
          };
        })
      : [];

    const vTempMappings = this.config.vtempMappings
      ? this.config.vtempMappings.split(";").map((entry) => {
          const [id, name] = entry.split("=");
          const [vid, tid] = id!.split("@");

          return {
            id: id!,
            vid: vid!,
            tid: tid!,
            name: name!.replace(/"/g, ""),
            safeId: id!.replace("@", "_"),
          };
        })
      : [];

    return [...tempMappings, ...vTempMappings];
  }

  getDeviceId(): string {
    return this.getConfig().device_name.toLowerCase().replace(/\s+/g, "_");
  }
}

export const configService = new ConfigService();
