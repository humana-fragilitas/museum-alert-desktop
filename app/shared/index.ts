export type DeviceOutgoingData = WiFiCredentials | USBCommand | ProvisioningSettings;

export type DeviceIncomingData =
  | { cid?: string, type: DeviceMessageType.APP_STATE; sn: string, data: DeviceStateUpdate }
  | { cid?: string, type: DeviceMessageType.WIFI_NETWORKS_LIST; sn: string, data: WiFiNetwork[] }
  | { cid?: string, type: DeviceMessageType.ERROR; sn: string, data: { error: DeviceErrorType }  }
  | { cid?: string, type: DeviceMessageType.ACKNOWLEDGMENT; sn: string, data?: undefined };

export type DeviceErrorMessage = Extract<DeviceIncomingData, { type: DeviceMessageType.ERROR }>;
export type DeviceStateMessage = Extract<DeviceIncomingData, { type: DeviceMessageType.APP_STATE }>;
export type DeviceWiFiMessage = Extract<DeviceIncomingData, { type: DeviceMessageType.WIFI_NETWORKS_LIST }>;
export type DeviceAckMessage = Extract<DeviceIncomingData, { type: DeviceMessageType.ACKNOWLEDGMENT }>;

export interface WiFiNetwork {
    encryptionType: number;
    rssi: number;
    ssid: string;
}

export enum USBCommandType {
  SET_PROVISIONING_CERTIFICATES,
  REFRESH_WIFI_CREDENTIALS,
  SET_WIFI_CREDENTIALS,
  RESET,
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

export interface ProvisioningSettings {
    tempCertPem: string;
    tempPrivateKey: string;
    idToken: string;
}

export interface USBCommand {
    command: USBCommandType;
}

export enum DeviceEvent {
    FOUND = 'device-found',
    CONNECTION_STATUS_UPDATE = 'device-connection-status-update',
    INCOMING_DATA = 'device-incoming-data',
    OUTGOING_DATA = 'device-outgoing-data'
}

export enum MainProcessEvent {
    WINDOW_FOCUSED = 'window-focused',
    SYSTEM_RESUMED = 'system-resumed',
    SESSION_CHECK = 'session-check',
    SYSTEM_SUSPENDED = "system-suspended"
}