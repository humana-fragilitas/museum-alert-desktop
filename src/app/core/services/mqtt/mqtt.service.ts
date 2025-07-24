import { AuthSession } from 'aws-amplify/auth';
import { BehaviorSubject, filter, Observable, Subscription } from 'rxjs';
import mqtt from 'mqtt';

import { Injectable } from '@angular/core';

import { APP_CONFIG } from '@env/environment';
import { SigV4Service } from '@services/sig-v4/sig-v4.service';
import { AuthService } from '@services/auth/auth.service';
import { DeviceService } from '@services/device/device.service';
import { PendingRequest,
         BaseMqttMessage,
         MqttMessage,
         MqttCommandType,
         MqttMessageType,
         DeviceConfiguration,
         AlarmPayload } from '@models/.';


@Injectable({
  providedIn: 'root'
})
export class MqttService {
  
  private pendingRequests: Record<string, PendingRequest<any>> = {};
  private client: mqtt.MqttClient | undefined;
  private currentSession: AuthSession | null = null;
  private authSubscription: Subscription | undefined;
  private isConnecting = false;
  private isDisconnecting = false;

  public readonly messages$ = new BehaviorSubject<Nullable<MqttMessage>>(null);

  constructor(
    private authService: AuthService,
    private sigV4Service: SigV4Service,
    private deviceService: DeviceService
  ) {

    console.log('[MqttService]: instance created');
    this.initializeAuthSubscription();
    this.setupMessageHandlers();

  }

  async connect(sessionData: AuthSession): Promise<void> {

    if (!this.authService.hasPolicy) {
      console.log('[MqttService]: user does not have an iot policy attached yet; skipping...');
    }

    if (this.isConnecting) {
      console.log('[MqttService]: connection already in progress, skipping...');
      return;
    }

    this.isConnecting = true;

    try {
      const { identityId: clientId } = sessionData;
      const url = this.sigV4Service.getSignedURL(sessionData);

      console.log('[MqttService]: connecting to MQTT broker...');

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
          const currentSession = this.authService.session;
          if (currentSession) {
            return this.sigV4Service.getSignedURL(currentSession);
          }
          return url;
        }
      });

      // Only setup event handlers once per client instance
      this.setupClientEventHandlers(sessionData);

    } catch (error) {
      console.error('[MqttService]: failed to connect to MQTT broker:', error);
      this.isConnecting = false;
      throw error;
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
            console.log('[MqttService]: MQTT client disconnected gracefully');
            resolve();
          });
        });
      }

      this.client = undefined;
    } catch (error) {
      console.error('[MqttService]: error during MQTT disconnect:', error);
    } finally {
      this.isDisconnecting = false;
    }
  }

  private clearPendingRequests(): void {
    Object.keys(this.pendingRequests).forEach(cid => {
      const { reject, timeout } = this.pendingRequests[cid];
      clearTimeout(timeout);
      reject(new Error('[MqttService]: connection closed'));
      delete this.pendingRequests[cid];
    });
  }

  get isConnected(): boolean {
    const connected = this.client?.connected || false;
    console.log(`[MqttService]: MQTT connection status: ${connected}`);
    return connected;
  }

  onMessageOfType<T extends MqttMessageType>(
    messageType: T | readonly T[],
    deviceSN: string = ''
  ): Observable<Extract<MqttMessage, { type: T }>> {
    const messageTypes = Array.isArray(messageType) ? messageType : [messageType];
    
    return this.messages$.pipe(
      filter((message): message is MqttMessage => message !== null),
      filter((message): message is Extract<MqttMessage, { type: T }> => 
        messageTypes.includes(message.type as T)
      ),
      filter((message) => deviceSN === '' || message.sn === deviceSN)
    );
  }

  sendCommand<T>(type: MqttCommandType, payload: any = null): Promise<T> {

    if (!this.isConnected) {
      return Promise.reject(new Error('[MqttService]: MQTT client is not connected'));
    }

    return new Promise<any>((resolve, reject) => {

      const company = this.authService.company;
      const deviceSN = this.deviceService.getSerialNumber();
      
      if (!company || !deviceSN) {
        reject(new Error('[MqttService]: missing company or device serial number'));
        return;
      }

      const topic = `companies/${company}/devices/${deviceSN}/commands`;
      const cid = this.deviceService.generateCid();

      console.log('[MqttService]: sending MQTT command:', { type, topic, cid, payload });

      // Store the pending request
      this.pendingRequests[cid] = {
        resolve: resolve as (data: any) => void,
        reject,
        timeout: setTimeout(() => {
          console.error(`[MqttService]: MQTT request ${cid} timed out`);
          delete this.pendingRequests[cid];
          reject(new Error('[MqttService]: MQTT request timeout'));
        }, APP_CONFIG.settings.MQTT_RESPONSE_TIMEOUT),
      };

      const messagePayload = JSON.stringify({
        type,
        cid,
        ...payload
      });

      this.client?.publish(topic, messagePayload, (error) => {
        if (error) {
          console.error('[MqttService]: failed to publish MQTT message:', error);
          clearTimeout(this.pendingRequests[cid]?.timeout);
          delete this.pendingRequests[cid];
          reject(error);
        }
      });
    });
    
  }

  cleanup(): void {

    this.authSubscription?.unsubscribe();
    this.disconnect();
    this.clearPendingRequests();

  }

  private initializeAuthSubscription(): void {
    this.authSubscription = this.authService.sessionData$.subscribe((sessionData: Nullable<AuthSession>) => {
      this.handleSessionChange(sessionData);
    });
  }

  private async handleSessionChange(sessionData: Nullable<AuthSession>): Promise<void> {

    console.log(`[MqttService]: session data changed, current connection status: `+ 
                `${ this.isConnected ? 'connected' : 'disconnected' }`);

    if (!sessionData) {
      console.log('[MqttService]: no session data, disconnecting MQTT');
      this.disconnect();
      this.currentSession = null;
      return;
    }

    // Check if this is just a token refresh for the same user
    const isSameUser = this.currentSession?.identityId === sessionData.identityId;
    const isConnectedAndSameUser = this.isConnected && isSameUser;

    if (isConnectedAndSameUser) {
      console.log('[MqttService]: session refreshed for same user, updating credentials without reconnecting');
      this.currentSession = sessionData;
      // Update the transform function to use new credentials
      return;
    }

    // Different user or not connected - need to reconnect
    if (this.isConnected) {
      console.log('[MqttService]: different user detected, reconnecting MQTT');
      await this.reconnect(sessionData);
    } else {
      console.log('[MqttService]: not connected, establishing new MQTT connection');
      await this.connect(sessionData);
    }

    this.currentSession = sessionData;

  }

  private async reconnect(sessionData: AuthSession): Promise<void> {
    console.log('[MqttService]: reconnecting MQTT client...');
    await this.disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
    await this.connect(sessionData);
  }

  private setupMessageHandlers(): void {

    this.onMessageOfType(MqttMessageType.ALARM)
      .subscribe((message: BaseMqttMessage<AlarmPayload>) => {
        this.deviceService.onAlarm(message);
        console.log(`[MqttService]: received message of type 'alarm':`, message);
      });

    this.onMessageOfType(MqttMessageType.CONFIGURATION)
      .subscribe((message: BaseMqttMessage<DeviceConfiguration>) => {
        console.log(`[MqttService]: received message of type 'configuration':`, message);
        this.deviceService.onConfiguration(message.data);
      });

    this.onMessageOfType(MqttMessageType.ACKNOWLEGDE)
      .subscribe((message: BaseMqttMessage<void>) => {
        console.log(`[MqttService]: received message of type 'acknowledgment':`, message);
      });
  }

  private setupClientEventHandlers(sessionData: AuthSession): void {

    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('[MqttService]: MQTT broker connected successfully');
      this.isConnecting = false;
      
      const company = sessionData.tokens?.idToken?.payload['custom:Company'];
      const topicToSubscribe = `companies/${company}/events`;
      
      this.client?.subscribe(topicToSubscribe, (error) => {
        if (error) {
          console.error('[MqttService]: failed to subscribe to topic:', topicToSubscribe, error);
        } else {
          console.log('[MqttService]: successfully subscribed to topic:', topicToSubscribe);
        }
      });
    });

    this.client.on('message', (topic, message) => {
      console.log(`[MqttService]: MQTT message received on topic ${topic}:`, message.toString());
      this.handleIncomingMessage(message);
    });

    this.client.on('error', (error) => {
      console.error('[MqttService]: MQTT client error:', error);
      this.isConnecting = false;
    });

    this.client.on('disconnect', (packet) => {
      console.log('[MqttService]: MQTT client disconnected:', packet);
    });

    this.client.on('close', () => {
      console.log('[MqttService]: MQTT connection closed');
      this.isConnecting = false;
    });

    this.client.on('reconnect', () => {
      console.log('[MqttService]: MQTT client attempting to reconnect...');
    });

    this.client.on('offline', () => {
      console.log('[MqttService]: MQTT client is offline');
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
    
    console.log('[MqttService]: MQTT client event handlers removed');

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
        console.log(`[MqttService]: received response for correlation ID: ${correlationId}`);
      }

      // Broadcast to all subscribers
      this.messages$.next(parsedMessage);

    } catch (error) {

      console.error('[MqttService]: failed to parse MQTT message:', error);

    }

  }

}