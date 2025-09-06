export interface PendingRequest<T> {
  resolve: (data: T) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}

export enum MqttMessageType {
  ALARM,
  CONNECTION_STATUS,
  CONFIGURATION,
  ACKNOWLEGDE
}

export enum MqttCommandType {
  RESET,
  GET_CONFIGURATION,
  SET_CONFIGURATION
}

export interface AlarmPayload {
  timestamp: number;
  distance: number;
}

export interface ConnectionStatus {
  connected: boolean;
}

export interface BaseDeviceConfiguration {
  distance?: number;
  beaconUrl?: string;
  firmware?: string;
}

export type DeviceConfiguration = BaseDeviceConfiguration & (
  | { distance: number }
  | { beaconUrl: string }
  | { firmware: string }
);

export interface BaseMqttMessage<T> {
  type: MqttMessageType;
  cid?: string
  sn: string;
  timestamp: number;
  data: T;
}

type MessageDataMap = {
  [MqttMessageType.ALARM]: AlarmPayload;
  [MqttMessageType.CONNECTION_STATUS]: ConnectionStatus;
  [MqttMessageType.CONFIGURATION]: DeviceConfiguration;
  [MqttMessageType.ACKNOWLEGDE]: void;
}

export type MqttMessage = {
  [K in keyof MessageDataMap]: BaseMqttMessage<MessageDataMap[K]> & { type: K }
}[keyof MessageDataMap];