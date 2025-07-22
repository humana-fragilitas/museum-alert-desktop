export interface PendingRequest<T> {
  resolve: (data: T) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}

// Outgoing messages:
// from device to app
export enum MqttMessageType {
  ALARM,
  CONNECTION_STATUS,
  CONFIGURATION,
  ACKNOWLEGDE
}

// Incoming messages:
// from app to device
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

// Base message interface with common properties
export interface BaseMqttMessage<T> {
  type: MqttMessageType;
  cid?: string
  sn: string;
  timestamp: number;
  data: T;
}

// TO DO: is it needed?
interface ResetCommand {
  type: MqttMessageType
}

// Type mapping for each message type
type MessageDataMap = {
  [MqttMessageType.ALARM]: AlarmPayload;
  [MqttMessageType.CONNECTION_STATUS]: ConnectionStatus;
  [MqttMessageType.CONFIGURATION]: DeviceConfiguration;
}

// Final discriminated union type
export type MqttMessage = {
  [K in keyof MessageDataMap]: BaseMqttMessage<MessageDataMap[K]> & { type: K }
}[keyof MessageDataMap];