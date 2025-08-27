/*
client.on('error', (error) => {
  if (error.code === 'ENOTFOUND' || 
      error.code === 'ECONNREFUSED' || 
      error.message.includes('unauthorized')) {
    console.log('Stopping reconnection due to:', error.message);
    shouldAllowReconnect = false;
    client.options.reconnectPeriod = 0;
    client.end(true);
  }
});
*/

import { AuthSession } from 'aws-amplify/auth';
import { BehaviorSubject,
         filter,
         Observable } from 'rxjs';
import mqtt from 'mqtt';

import { Injectable, effect } from '@angular/core';

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
         AlarmPayload } from '@models';

@Injectable({
  providedIn: 'root'
})
export class MqttService {
  
  private pendingRequests: Record<string, PendingRequest<any>> = {};
  private client: mqtt.MqttClient | undefined;
  private lastIdentityId: string | undefined;
  private isConnecting = false;
  private isDisconnecting = false;
  private connectionPromise: Nullable<Promise<void>> = null;
  private disconnectionPromise: Nullable<Promise<void>> = null;
  private readonly sessionDataSignal = this.authService.sessionData;

  readonly messages$ = new BehaviorSubject<Nullable<MqttMessage>>(null);

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

    // Check if user has policy
    if (!this.authService.hasPolicy()) {
      console.log('[MqttService]: user does not have an iot policy attached yet; skipping...');
      return;
    }

    // If already connecting, return the existing promise
    if (this.connectionPromise) {
      console.log('[MqttService]: connection already in progress, waiting...');
      return this.connectionPromise;
    }

    // If already connected to the same session, no need to reconnect
    if (this.isConnected && this.lastIdentityId === sessionData.identityId) {
      console.log('[MqttService]: already connected to the same session');
      this.lastIdentityId = sessionData.identityId; // Update last identity ID for token refresh
      return;
    }

    this.connectionPromise = this._connect(sessionData);
    
    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }

  }

  private async _connect(sessionData: AuthSession): Promise<void> {

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
          const currentSession = this.sessionDataSignal();
          if (this.authService.isSessionTokenExpired()) {
            throw new Error('[MqttService]: Session token expired, preventing reconnection');
          } else if (currentSession) {
            return this.sigV4Service.getSignedURL(currentSession);
          } else {
          console.log('[MqttService]: no session available, preventing reconnection');
          throw new Error('[MqttService]: No session available for reconnection');
          }
        }
      });

      // Setup event handlers once per client instance
      this.setupClientEventHandlers(sessionData);

      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        if (!this.client) {
          reject(new Error('Client is undefined'));
          return;
        }

        const onConnect = () => {
          this.client?.off('error', onError);
          resolve();
        };

        const onError = (error: Error) => {
          this.client?.off('connect', onConnect);
          reject(error);
        };

        this.client.once('connect', onConnect);
        this.client.once('error', onError);
      });

      this.lastIdentityId = sessionData?.identityId;
      console.log('[MqttService]: MQTT connection established successfully');

    } catch (error) {

      console.error('[MqttService]: failed to connect to MQTT broker:', error);
      this.cleanup();
      throw error;

    } finally {

      this.isConnecting = false;

    }

  }

  async disconnect(): Promise<void> {

    // If already disconnecting, return the existing promise
    if (this.disconnectionPromise) {
      console.log('[MqttService]: disconnection already in progress, waiting...');
      return this.disconnectionPromise;
    }

    // If not connected and not connecting, nothing to do
    if (!this.client && !this.isConnecting) {
      console.log('[MqttService]: no client to disconnect');
      return;
    }

    this.disconnectionPromise = this._disconnect();
    
    try {
      await this.disconnectionPromise;
    } finally {
      this.disconnectionPromise = null;
    }

  }

  private async _disconnect(): Promise<void> {

    this.isDisconnecting = true;

    try {
      // Clear all pending requests
      this.clearPendingRequests();

      if (this.client) {
        // Remove all event listeners before disconnecting
        this.removeClientEventHandlers();

        // Disconnect client if connected
        if (this.client.connected) {
          await new Promise<void>((resolve) => {
            this.client!.end(true, {}, () => {
              console.log('[MqttService]: MQTT client disconnected gracefully');
              resolve();
            });
          });
        }

        this.client = undefined;
      }

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

      const company = this.authService.company();
      const deviceSN = this.deviceService.serialNumber();
      
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
    this.disconnect();
    this.clearPendingRequests();
  }

  private initializeAuthSubscription(): void {
    effect(() => {
      const sessionData = this.sessionDataSignal();
      this.handleSessionChange(sessionData);
    });
  }

  private async handleSessionChange(sessionData: Nullable<AuthSession>): Promise<void> {

    console.log(`[MqttService]: session data changed, current connection status: `+ 
                `${ this.isConnected ? 'connected' : 'disconnected' }`);

    try {
      
      if (!sessionData) {
        console.log('[MqttService]: no session data, disconnecting MQTT');
        await this.disconnect();
        return;
      }

      // Check if this is the same user (just a token refresh)
      const isSameUser = sessionData?.identityId === this.lastIdentityId;

      if (this.isConnected && isSameUser) {
        console.log('[MqttService]: session refreshed for same user, updating credentials without reconnecting');
        return;
      }

      // Different user or not connected - need to connect/reconnect
      if (this.isConnected && !isSameUser) {
        console.log('[MqttService]: different user detected, reconnecting MQTT');
        await this.disconnect();
        // Small delay to ensure clean disconnection
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('[MqttService]: establishing MQTT connection');
      await this.connect(sessionData);

    } catch (error) {
      
      console.error('[MqttService]: error handling session change:', error);
      
    }

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
    });

    this.client.on('disconnect', (packet) => {
      console.log('[MqttService]: MQTT client disconnected:', packet);
    });

    this.client.on('close', () => {
      console.log('[MqttService]: MQTT connection closed');
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