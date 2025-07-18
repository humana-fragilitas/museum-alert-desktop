export type DeviceOutgoingData = WiFiCredentials | ProvisioningData | USBCommand;

export type DeviceIncomingData =
  | { cid?: string, type: DeviceMessageType.APP_STATE; sn: string, data: DeviceStateUpdate }
  | { cid?: string, type: DeviceMessageType.WIFI_NETWORKS_LIST; sn: string, data: WiFiNetwork[] }
  | { cid?: string, type: DeviceMessageType.ERROR; sn: string, data: { error: DeviceErrorType }  }
  | { cid?: string, type: DeviceMessageType; sn: string, data?: undefined };

export interface WiFiNetwork {
    encryptionType: number;
    rssi: number;
    ssid: string;
}

export enum USBCommandType {
  SET_PROVISIONING_CERTIFICATES,
  REFRESH_WIFI_CREDENTIALS,
  SET_WIFI_CREDENTIALS,
  HARD_RESET,
  // Add more commands here
  USB_COMMAND_TYPE_COUNT,
  USB_COMMAND_INVALID = -1
};

export interface Error {
    type: DeviceErrorType;
}

export interface DeviceStateUpdate {
    appState: DeviceAppState
}

export enum DeviceAppState {
    STARTED,
    INITIALIZE_CIPHERING,
    CONFIGURE_WIFI,
    CONFIGURE_CERTIFICATES,
    CONNECT_TO_WIFI,
    PROVISION_DEVICE,
    CONNECT_TO_MQTT_BROKER,
    DEVICE_INITIALIZED,
    FATAL_ERROR
  };

export enum DeviceMessageType {
    APP_STATE,
    WIFI_NETWORKS_LIST,
    ERROR,
    ACKNOWLEDGMENT
};

export enum DeviceErrorType {
    INVALID_WIFI_CREDENTIALS,
    FAILED_WIFI_CONNECTION_ATTEMPT,
    INVALID_DEVICE_PROVISIONING_SETTINGS,
    INVALID_DEVICE_COMMAND,
    FAILED_PROVISIONING_SETTINGS_STORAGE,
    FAILED_DEVICE_PROVISIONING_ATTEMPT,
    FAILED_MQTT_BROKER_CONNECTION,
    FAILED_DEVICE_CONFIGURATION_RETRIEVAL,
    FAILED_SENSOR_DETECTION_REPORT
};

export interface WiFiCredentials {
    ssid: string;
    password: string;
}

export interface ProvisioningData {
    tempCert: string;
    tempKey: string;
}

export interface USBCommand {
    command: USBCommandType;
}