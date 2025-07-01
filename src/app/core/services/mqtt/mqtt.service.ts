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
  ALARM,
  CONNECTION_STATUS,
  CONFIGURATION,
  ACK
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

@Injectable({
  providedIn: 'root'
})
export class MqttService {
  
  private pendingRequests: Record<string, PendingRequest<any>> = {};
  public readonly messages$ = new BehaviorSubject<Nullable<MqttMessage>>(null);
  public readonly devicesConnectionStatus$: BehaviorSubject<Map<string, boolean>> =
    new BehaviorSubject<Map<string, boolean>>(new Map());

  private client: mqtt.MqttClient | undefined;
  private currentSession: AuthSession | null = null;
  private authSubscription: Subscription | undefined;
  private isConnecting = false;
  private isDisconnecting = false;

  constructor(
    private authService: AuthService,
    private sigV4Service: SigV4Service,
    private deviceService: DeviceService
  ) {
    console.log('MqttService instance! New version!');
    this.initializeAuthSubscription();
    this.setupMessageHandlers();
  }

  private initializeAuthSubscription(): void {
    this.authSubscription = this.authService.sessionData.subscribe((sessionData: Nullable<AuthSession>) => {
      this.handleSessionChange(sessionData);
    });
  }

  private async handleSessionChange(sessionData: Nullable<AuthSession>): Promise<void> {
    console.log('Session data changed, current connection status:', this.isConnected);

    if (!sessionData) {
      console.log('No session data, disconnecting MQTT');
      this.disconnect();
      this.currentSession = null;
      return;
    }

    // Check if this is just a token refresh for the same user
    const isSameUser = this.currentSession?.identityId === sessionData.identityId;
    const isConnectedAndSameUser = this.isConnected && isSameUser;

    if (isConnectedAndSameUser) {
      console.log('Session refreshed for same user, updating credentials without reconnecting');
      this.currentSession = sessionData;
      // Update the transform function to use new credentials
      return;
    }

    // Different user or not connected - need to reconnect
    if (this.isConnected) {
      console.log('Different user detected, reconnecting MQTT');
      await this.reconnect(sessionData);
    } else {
      console.log('Not connected, establishing new MQTT connection');
      await this.connect(sessionData);
    }

    this.currentSession = sessionData;
  }

  private async reconnect(sessionData: AuthSession): Promise<void> {
    console.log('Reconnecting MQTT client...');
    await this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
    await this.connect(sessionData);
  }

  private setupMessageHandlers(): void {
    this.onMessageOfType(MqttMessageType.CONNECTION_STATUS)
      .subscribe((message: BaseMqttMessage<ConnectionStatus>) => {
        const currentMap = this.devicesConnectionStatus$.getValue();
        const newMap = new Map(currentMap);
        newMap.set(message.sn, message.data.connected);
        this.devicesConnectionStatus$.next(newMap);
        console.log("Devices connection status:", newMap);
      });

    this.onMessageOfType(MqttMessageType.ALARM)
      .subscribe((message: BaseMqttMessage<AlarmPayload>) => {
        this.deviceService.alarm$.next(message);
        console.log("Alarm:", message);
      });

    this.onMessageOfType(MqttMessageType.CONFIGURATION)
      .subscribe((message: BaseMqttMessage<DeviceConfiguration>) => {
        this.deviceService.configuration$.next(message.data);
        console.log("Device configuration:", message);
      });

    this.onMessageOfType(MqttMessageType.ACK)
      .subscribe((message: BaseMqttMessage<DeviceConfiguration>) => {
        console.log("Acknowledgment:", message);
      });
  }

  async connect(sessionData: AuthSession): Promise<void> {
    if (this.isConnecting) {
      console.log('Connection already in progress, skipping...');
      return;
    }

    this.isConnecting = true;

    try {
      const { identityId: clientId } = sessionData;
      const url = this.sigV4Service.getSignedURL(sessionData);

      console.log('Connecting to MQTT broker...');

      this.client = mqtt.connect(url, {
        clientId,
        protocolId: 'MQTT',
        protocolVersion: 4,
        port: 443,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
        keepalive: 60,
        transformWsUrl: (url, options, client) => {
          const currentSession = this.authService.sessionData.getValue();
          if (currentSession) {
            return this.sigV4Service.getSignedURL(currentSession);
          }
          return url;
        }
      });

      // Only setup event handlers once per client instance
      this.setupClientEventHandlers(sessionData);

    } catch (error) {
      console.error('Failed to connect to MQTT broker:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  private setupClientEventHandlers(sessionData: AuthSession): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('MQTT broker connected successfully');
      this.isConnecting = false;
      
      const company = sessionData.tokens?.idToken?.payload['custom:Company'];
      const topicToSubscribe = `companies/${company}/events`;
      
      this.client?.subscribe(topicToSubscribe, (error) => {
        if (error) {
          console.error('Failed to subscribe to topic:', topicToSubscribe, error);
        } else {
          console.log('Successfully subscribed to topic:', topicToSubscribe);
        }
      });
    });

    this.client.on('message', (topic, message) => {
      console.log(`MQTT message received on topic ${topic}:`, message.toString());
      this.handleIncomingMessage(message);
    });

    this.client.on('error', (error) => {
      console.error('MQTT client error:', error);
      this.isConnecting = false;
    });

    this.client.on('disconnect', (packet) => {
      console.log('MQTT client disconnected:', packet);
    });

    this.client.on('close', () => {
      console.log('MQTT connection closed');
      this.isConnecting = false;
    });

    this.client.on('reconnect', () => {
      console.log('MQTT client attempting to reconnect...');
    });

    this.client.on('offline', () => {
      console.log('MQTT client is offline');
    });
  }

  private removeClientEventHandlers(): void {
    if (!this.client) return;
    
    // Remove all event listeners
    this.client.removeAllListeners('connect');
    this.client.removeAllListeners('message');
    this.client.removeAllListeners('error');
    this.client.removeAllListeners('disconnect');
    this.client.removeAllListeners('close');
    this.client.removeAllListeners('reconnect');
    this.client.removeAllListeners('offline');
    
    console.log('MQTT client event handlers removed');
  }

  private handleIncomingMessage(message: Buffer): void {
    try {
      const parsedMessage = JSON.parse(message.toString()) as MqttMessage;
      const correlationId = parsedMessage.cid;

      // Handle request-response pattern
      if (correlationId && this.pendingRequests[correlationId]) {
        const { resolve, timeout } = this.pendingRequests[correlationId];
        clearTimeout(timeout);
        resolve(parsedMessage);
        delete this.pendingRequests[correlationId];
        console.log(`Received response for correlation ID: ${correlationId}`);
      }

      // Broadcast to all subscribers
      this.messages$.next(parsedMessage);

    } catch (error) {
      console.error('Failed to parse MQTT message:', error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.isDisconnecting || !this.client) {
      return;
    }

    this.isDisconnecting = true;

    try {
      // Clear all pending requests
      this.clearPendingRequests();

      // Remove all event listeners before disconnecting
      this.removeClientEventHandlers();

      // Disconnect client
      if (this.client.connected) {
        await new Promise<void>((resolve) => {
          this.client!.end(true, {}, () => {
            console.log('MQTT client disconnected gracefully');
            resolve();
          });
        });
      }

      this.client = undefined;
    } catch (error) {
      console.error('Error during MQTT disconnect:', error);
    } finally {
      this.isDisconnecting = false;
    }
  }

  private clearPendingRequests(): void {
    Object.keys(this.pendingRequests).forEach(cid => {
      const { reject, timeout } = this.pendingRequests[cid];
      clearTimeout(timeout);
      reject(new Error('Connection closed'));
      delete this.pendingRequests[cid];
    });
  }

  get isConnected(): boolean {
    const connected = this.client?.connected || false;
    console.log(`MQTT connection status: ${connected}`);
    return connected;
  }

  onMessageOfType<T extends MqttMessageType>(
    messageType: T, 
    deviceSN: string = ''
  ): Observable<Extract<MqttMessage, { type: T }>> {
    return this.messages$.pipe(
      filter((message): message is MqttMessage => message !== null),
      filter((message): message is Extract<MqttMessage, { type: T }> => message.type === messageType),
      filter((message) => deviceSN === '' || message.sn === deviceSN)
    );
  }

  sendCommand(type: MqttCommandType, payload: any = null): Promise<any> {
    if (!this.isConnected) {
      return Promise.reject(new Error('MQTT client is not connected'));
    }

    return new Promise<any>((resolve, reject) => {
      const company = this.currentSession?.tokens?.idToken?.payload['custom:Company'];
      const deviceSN = this.deviceService.serialNumber$.getValue();
      
      if (!company || !deviceSN) {
        reject(new Error('Missing company or device serial number'));
        return;
      }

      const topic = `companies/${company}/devices/${deviceSN}/commands`;
      const cid = this.deviceService.generateCid();

      console.log('Sending MQTT command:', { type, topic, cid, payload });

      // Store the pending request
      this.pendingRequests[cid] = {
        resolve: resolve as (data: any) => void,
        reject,
        timeout: setTimeout(() => {
          console.error(`MQTT request ${cid} timed out`);
          delete this.pendingRequests[cid];
          reject(new Error("MQTT request timeout"));
        }, APP_CONFIG.settings.MQTT_RESPONSE_TIMEOUT),
      };

      // Publish the command
      const messagePayload = JSON.stringify({
        type,
        cid,
        ...payload
      });

      this.client?.publish(topic, messagePayload, (error) => {
        if (error) {
          console.error('Failed to publish MQTT message:', error);
          clearTimeout(this.pendingRequests[cid]?.timeout);
          delete this.pendingRequests[cid];
          reject(error);
        }
      });
    });
  }

  // Add cleanup method for manual cleanup if needed (like in tests)
  cleanup(): void {
    this.authSubscription?.unsubscribe();
    this.disconnect();
    this.clearPendingRequests();
  }
}