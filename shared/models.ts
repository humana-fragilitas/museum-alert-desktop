export type DeviceIncomingData =
  | { type: DeviceMessageType.APP_STATE; sn: string, data: DeviceStateUpdate }
  | { type: DeviceMessageType.WIFI_NETWORKS_LIST; sn: string, data: WiFiNetwork[] }
  | { type: DeviceMessageType.ERROR; sn: string, data: { error: DeviceErrorType }  }
  | { type: DeviceMessageType; sn: string, data?: undefined };

  export type DeviceOutgoingData = WiFiCredentials | ProvisioningData | USBCommand;

  // TO DO: add device outgoing data types: USBCommandType...

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
    ERROR
};

export enum DeviceErrorType {
    NONE,
    CIPHERING_INITIALIZATION_ERROR,
    INVALID_WIFI_CREDENTIALS,
    FAILED_WIFI_CONNECTION_ATTEMPT,
    INVALID_DEVICE_PROVISIONING_SETTINGS,
    FAILED_PROVISIONING_SETTINGS_STORAGE,
    FAILED_DEVICE_PROVISIONING_ATTEMPT,
    FAILED_MQTT_BROKER_CONNECTION,
    FAILED_DEVICE_CONFIGURATION_RETRIEVAL,
    FAILED_SENSOR_DETECTION_REPORT
};

export enum USBCommandType {
    HARD_RESET,
    // Add more commands here
    USB_COMMAND_TYPE_COUNT,
    USB_COMMAND_INVALID = -1
};

export enum AppErrorType {
    API_ERROR
};

export enum ErrorType {
    DEVICE_ERROR,
    APP_ERROR
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

export interface Error {
    type: DeviceErrorType;
}

export interface DeviceStateUpdate {
    appState: DeviceAppState
}

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