import type { Translations } from "./i18n/types";

export interface Config {
  ecoal_host: string;
  ecoal_username: string;
  ecoal_password: string;
  mqtt_broker: string;
  mqtt_port: number;
  mqtt_username: string;
  mqtt_password: string;
  mqtt_topic_prefix: string;
  device_name: string;
  poll_interval: number;
  log_level: string;
  entity_language: string;
  tempMappings: string;
  vtempMappings: string;
}

export interface ECoalRegister {
  vid: string;
  tid: string;
  v?: string;
  min?: string;
  max?: string;
  status?: string;
}

export interface ECoalResponse {
  cmd: {
    status: string;
    device: {
      id: string;
      reg: ECoalRegister[];
    };
  };
}

export interface ECoalInfoResponse {
  cmd: {
    status: string;
    hardware: {
      type: string;
      hardwareversion: string;
      softwareversion: string;
    };
  };
}

export interface ECoalData {
  cmd: {
    status: string;
    device: {
      id: string;
      reg: ECoalRegister[];
    };
  };
}

export interface SystemStatus {
  device_name: string;
  ecoal_host: string;
  mqtt_connected: boolean;
  poll_interval: number;
  uptime: number;
}

export interface SensorMapping {
  name: keyof Translations;
  mqttUniqueId: string;
  tid: TID;
  unit?: string;
  type?: "temp" | "percentage" | "state" | "enum";
  values?: Record<string, keyof Translations>;
}

export type TID =
  | "tzew_value"
  | "fuel_level"
  | "next_fuel_time"
  | "ob1_pog_en"
  | "tryb_auto_state"
  | "tcwu_value"
  | "tkot_value"
  | "tpod_value"
  | "twew_value"
  | "t1_value"
  | "t2_value"
  | "tsp_value"
  | "act_dm_speed"
  | "kot_tzad"
  | "out_pomp1"
  | "out_cwutzad"
  | "out_pomp2"
  | "tzew_act"
  | "kot_tact"
  | "ob1_pok_tact"
  | "ob1_pok_tzad"
  | "ob1_zaw4d_tzad"
  | "ob1_zaw4d_pos"
  | "ob2_pok_tact"
  | "ob2_pok_tzad"
  | "ob2_zaw4d_tzad"
  | "ob2_zaw4d_pos"
  | "cwu_tact"
  | "ob3_pok_tact"
  | "ob3_pok_tzad"
  | "ob3_zaw4d_tzad"
  | "ob3_zaw4d_pos"
  | "cwu_tzad"
  | "ob1_tzad"
  | "out_cwu"
  | "tpow_value"
  | "temp"
  | "vtemp"
  | "pod_typ";

export interface TemperatureControlMapping {
  name: keyof Translations;
  mqttUniqueId: string;
  setId: TID;
  readoutId: TID;
  currentSetValueId: TID;
  unit: string;
  minValue: number;
  maxValue: number;
}

export interface ApiResponse {
  success: boolean;
  data?: ECoalData;
  error?: string;
  timestamp: string;
}

export type CustomMapping = {
  tid: string;
  vid: string;
  name: string;
  id: string;
  safeId: string;
};
