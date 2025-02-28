export type DeviceIncomingData =
  | { type: DeviceMessageType.APP_STATE; data: DeviceAppState }
  | { type: DeviceMessageType.SENSOR_DETECTION; data: AlarmPayload }
  | { type: DeviceMessageType.WIFI_NETWORKS_LIST; data: WiFiNetwork[] } // JSON-like object
  | { type: DeviceMessageType; data?: undefined };

export enum DeviceAppState {
    STARTED,
    INITIALIZE_CIPHERING,
    CONFIGURE_WIFI,
    CONFIGURE_CERTIFICATES,
    CONNECT_TO_WIFI,
    PROVISION_DEVICE,
    CONNECT_TO_MQTT_BROKER,
    DEVICE_INITIALIZED
};

export enum DeviceMessageType {
    APP_STATE,
    WIFI_NETWORKS_LIST,
    SENSOR_DETECTION
};

export interface WiFiNetwork {
    encryptionType: number;
    rssi: number;
    ssid: string;
}

export interface AlarmPayload {
    hasAlarm: boolean;
    distance: number;
}