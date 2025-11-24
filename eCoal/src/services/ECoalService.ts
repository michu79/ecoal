import type { Config, ECoalInfoResponse, ECoalResponse } from "../types";
import { legacyFetch } from "../utils/legacyFetch";
import { logger } from "../utils/logger";

export class ECoalService {
  private config: Config;

  constructor(config: Config) {
    this.config = config;

    legacyFetch(`http://${this.config.ecoal_host}/info.cgi`, {
      user: this.config.ecoal_username,
      pass: this.config.ecoal_password,
    }).then(async (data) => {
      const hwData = (await data.json()) as ECoalInfoResponse;

      if (hwData.cmd.hardware.hardwareversion !== "3.5") {
        throw new Error(
          `Unsupported hardware version: ${hwData.cmd.hardware.hardwareversion}. Supported version: 3.5`,
        );
      }

      logger.info(
        `Connected to eCoal v${hwData.cmd.hardware.hardwareversion} (${hwData.cmd.hardware.softwareversion})`,
      );
    });
  }

  async fetchData(): Promise<ECoalResponse | null> {
    try {
      const url = `http://${this.config.ecoal_host}/getregister.cgi?device=0&tzew_value&fuel_level&next_fuel_time&ob1_pog_en&tryb_auto_state&tcwu_value&tkot_value&tpow_value&tpod_value&twew_value&t1_value&t2_value&tsp_value&act_dm_speed&kot_tzad&out_pomp1&out_cwutzad&out_pomp2&tzew_act&kot_tact&ob1_pok_tact&ob1_pok_tzad&ob1_zaw4d_tzad&ob1_zaw4d_pos&ob2_pok_tact&ob2_pok_tzad&cwu_tact&ob3_pok_tact&ob3_pok_tzad&ob3_zaw4d_tzad&ob3_zaw4d_pos`;

      const response = await legacyFetch(url, {
        user: this.config.ecoal_username,
        pass: this.config.ecoal_password,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as ECoalResponse;

      logger.debug("Fetched eCoal data successfully");
      return data;
    } catch (error) {
      logger.error("Failed to fetch eCoal data:", error);
      return null;
    }
  }

  async setValue(parameter: string, value: string | number): Promise<boolean> {
    try {
      const url = `http://${this.config.ecoal_host}/setregister.cgi?device=0&${parameter}=${value}`;

      const response = await legacyFetch(url, {
        user: this.config.ecoal_username,
        pass: this.config.ecoal_password,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      logger.info(`Successfully set ${parameter} to ${value}`);
      return true;
    } catch (error) {
      logger.error(`Failed to set ${parameter} to ${value}:`, error);
      return false;
    }
  }
}
