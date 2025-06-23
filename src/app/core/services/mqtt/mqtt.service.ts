import { Injectable } from '@angular/core';
import { APP_CONFIG } from '../../../../environments/environment';

import { AuthSession, fetchAuthSession } from 'aws-amplify/auth';

import mqtt from 'mqtt';
import { v4 as uuidv4 } from "uuid";

import { SigV4Service } from '../sig-v4/sig-v4.service';
import { AuthService } from '../auth/auth.service';
import { BehaviorSubject, filter, Observable, Subscription } from 'rxjs';
import { DeviceService } from '../device/device.service';
import { PendingRequest } from '@shared/models';

// Outgoing messages:
// from device to app
export enum MqttMessageType {
  ALARM = 100,
  CONNECTION_STATUS = 101,
  CONFIGURATION = 102,
  ACK = 103
}

// Incoming messages:
// from app to device
export enum MqttCommandType {
  RESET = 200,
  GET_CONFIGURATION = 201,
  SET_CONFIGURATION = 202
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

@Injectable({
  providedIn: 'root'
})
export class MqttService {
  
  private pendingRequests: Record<string, PendingRequest<any>> = {};
  public readonly messages$ = new BehaviorSubject<Nullable<MqttMessage>>(null);
  public readonly devicesConnectionStatus$: BehaviorSubject<Map<string, boolean>> =
    new BehaviorSubject<Map<string, boolean>>(new Map());

  private client: mqtt.MqttClient | undefined;

  constructor(
    private authService: AuthService,
    private sigV4Service: SigV4Service,
    private deviceService: DeviceService
  ) {

    console.log('MqttService instance! New version! ');

    this.authService.sessionData.subscribe((sessionData: Nullable<AuthSession>) => {

      if (sessionData && !this.isConnected) {
        this.connect(sessionData);
      } else {
        this.disconnect();
      }       

    });

    this.onMessageOfType(MqttMessageType.CONNECTION_STATUS)
        .subscribe((message: BaseMqttMessage<ConnectionStatus>) => {

          const currentMap = this.devicesConnectionStatus$.getValue();
          const newMap = new Map(currentMap);
          newMap.set(message.sn, message.data.connected);
          this.devicesConnectionStatus$.next(newMap);
          console.log("Devices connection status: ", newMap);

        });

    this.onMessageOfType(MqttMessageType.ALARM)
        .subscribe((message: BaseMqttMessage<AlarmPayload>) => {

          this.deviceService.alarm$.next(message);
          console.log("Alarm: ", message);

        });

    this.onMessageOfType(MqttMessageType.CONFIGURATION)
        .subscribe((message: BaseMqttMessage<DeviceConfiguration>) => {
          
          this.deviceService.configuration$.next(message.data);
          console.log("Device configuration: ", message);

        });

    this.onMessageOfType(MqttMessageType.ACK)
        .subscribe((message: BaseMqttMessage<DeviceConfiguration>) => {

          console.log("Acknowledgment: ", message);

        });

  }

  async connect(sessionData: AuthSession) {

    const {
      identityId: clientId
    } = sessionData;

    const url = this.sigV4Service.getSignedURL(sessionData);

    this.client = mqtt.connect(url, {
        clientId,
        protocolId: 'MQTT',
        protocolVersion: 4,
        port: 443,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
        transformWsUrl: (url, options, client) => {
          return this.sigV4Service.getSignedURL(
            this.authService.sessionData.getValue()!
          );
        }
        /* will: {
          topic: 'willTopic',
          payload: '',
          qos: 0,
          retain: false
        }, */
        //rejectUnauthorized: false
      });

    this.client.on('connect', () => {

      console.log('MQTT broker connected');
      this.client?.subscribe(`companies/${sessionData.tokens?.idToken?.payload['custom:Company']}/events`);
      console.log(`companies/${String(sessionData.tokens?.idToken?.payload['custom:Company']).toLocaleLowerCase()}/events`);
      
    });

    this.client.on('message', (topic, message) => {

      console.log(`MQTT broker received the following message: ${message.toString()} on topic: ${topic}`);

      try {

        const parsedMessage = JSON.parse(message.toString()) as MqttMessage;
        const correlationId = parsedMessage.cid;

        if(correlationId && this.pendingRequests[correlationId]) {
          const { resolve, timeout } = this.pendingRequests[correlationId];
          clearTimeout(timeout);
          resolve(parsedMessage);
          delete this.pendingRequests[correlationId];
          console.log(`Received response via MQTT for request with correlation id: ${correlationId}`);
        }

        this.messages$.next(parsedMessage);

      } catch (error) {
        console.error('Failed to parse MQTT message:', error);
      }

    });

    this.client.on('error', (error) => {

      console.log(`Error:`);
      console.log(error);
      // Handle the message

    });

    this.client.on('disconnect', (error) => {

      console.log(`Disconnect:`);
      console.log(error);

    });

    this.client.on('close', () => {

      console.log(`Connection closed`);
      // Handle the message

    });

  }

  disconnect() {

    this.client?.end();

  }

  get isConnected(): boolean { 

    console.log(`Is connected: ${this.client?.connected }`);

    return this.client?.connected as boolean;

  }

  onMessageOfType<T extends MqttMessageType>(messageType: T, deviceSN: string = ''): Observable<Extract<MqttMessage, { type: T }>> {

    return this.messages$.pipe(
      filter((message): message is MqttMessage => message !== null),
      filter((message): message is Extract<MqttMessage, { type: T }> => message.type === messageType),
      filter((message) => deviceSN === '' || message.sn === deviceSN)
    );

  }

  sendCommand(type: MqttCommandType, payload: any = null): Promise<any> {

    return new Promise<any>((resolve, reject) => {
      
      const company = this.authService.sessionData.getValue()?.tokens?.idToken?.payload['custom:Company'];
      const deviceSN = this.deviceService.serialNumber$.getValue();
      const topic = `companies/${company}/devices/${deviceSN}/commands`;
      const cid = this.deviceService.generateCid();

      console.log('Sending command via MQTT:', type, payload, topic);

      this.pendingRequests[cid] = {
        resolve: resolve as (data: any) => void,
        reject,
        timeout: setTimeout(() => {
          console.error(`Request ${cid} timed out.`);
          reject(new Error("MQTT request timeout"));
          delete this.pendingRequests[cid];
        }, APP_CONFIG.settings.MQTT_RESPONSE_TIMEOUT),
      };

      this.client?.publish(topic, JSON.stringify({
        type,
        cid,
        ...payload
      }));

    });

  }

}
