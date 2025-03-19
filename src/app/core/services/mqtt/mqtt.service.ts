import { Injectable } from '@angular/core';
import { APP_CONFIG } from '../../../../environments/environment';

import { AuthSession, fetchAuthSession } from 'aws-amplify/auth';
import * as dayjs from 'dayjs'
import * as utc from 'dayjs/plugin/utc';
import mqtt from 'mqtt';

import { SigV4Service } from '../../../shared/helpers/sig-v4.service';
import { AuthService } from '../auth/auth.service';
import { BehaviorSubject, filter, Observable, Subscription } from 'rxjs';

/*

Alarm message (current status):

{
  "hasAlarm":true,
  "distance":3,
  "company":"acme",
  "sn":"MAS-EC357A188534"
} on topic: companies/acme/events

Alarm message (to be):

{
  "type": 0,
  "sn": "MAS-EC357A188534",
  "timestamp":1742376361092
  "data": {
    "distance":3
  }
}

--------------------
current SQL query:

SELECT *, topic(2) AS company, topic(4) AS sn FROM 'companies/+/devices/+/events'
--------------------

Connection message (current status):

{
  "type":3,
  "data": {
    "sn":"MAS-EC357A188534",
    "connected":false,
    "timestamp":1742376361092
    }
  }
}

Connection message (to be):

{
  "type":3,
  "sn":"MAS-EC357A188534",
  "timestamp":1742376361092
  "data": {
    "connected":false
    }
  }
}

*/

export enum MqttMessageType {
  ALARM_NOTIFICATION,
  CONNECTION_STATUS,
  COMMUNICATION_ACKNOWLEDGMENT
}

export interface AlarmPayload {
  distance: number;
}

export interface ConnectionStatus {
  connected: boolean;
}

export interface CommunicationAcknowledgment {
  received: boolean;
  messageId: string;
}

// Base message interface with common properties
interface BaseMqttMessage<T> {
  type: MqttMessageType;
  sn: string;
  timestamp: number;
  data: T;
}

// Type mapping for each message type
type MessageDataMap = {
  [MqttMessageType.ALARM_NOTIFICATION]: AlarmPayload;
  [MqttMessageType.CONNECTION_STATUS]: ConnectionStatus;
  [MqttMessageType.COMMUNICATION_ACKNOWLEDGMENT]: CommunicationAcknowledgment;
}

// Final discriminated union type
export type MqttMessage = {
  [K in MqttMessageType]: BaseMqttMessage<MessageDataMap[K]> & { type: K }
}[MqttMessageType];

@Injectable({
  providedIn: 'root'
})
export class MqttService {

  public readonly messages$ = new BehaviorSubject<Nullable<MqttMessage>>(null);
  public readonly devicesConnectionStatus$: BehaviorSubject<Map<string, boolean>> =
    new BehaviorSubject<Map<string, boolean>>(new Map());

  private client: mqtt.MqttClient | undefined;

  constructor(authService: AuthService, private sigV4Service: SigV4Service) {

    console.log('MqttService instance! New version! ');

    authService.sessionData.subscribe((sessionData: AuthSession | null) => {

      if (sessionData && !this.isConnected) {
        this.connect(sessionData);
      } else {
        this.disconnect();
      }       

    });

    this.onMessageOfType(MqttMessageType.CONNECTION_STATUS)
        .subscribe((message) => {

          const currentMap = this.devicesConnectionStatus$.getValue();
          const newMap = new Map(currentMap);
          newMap.set(message.sn, message.data.connected);
          this.devicesConnectionStatus$.next(newMap);

          console.log("Devices connection status: ", newMap);

        });

    this.onMessageOfType(MqttMessageType.ALARM_NOTIFICATION)
        .subscribe((message) => {

          console.log("Alarm: ", message);

        });

  }

  connect(sessionData: AuthSession) {

    const host = APP_CONFIG.aws.IoTCore.endpoint;
    const algorithm = APP_CONFIG.aws.algorithm;
    const service = APP_CONFIG.aws.IoTCore.service;
    const region = APP_CONFIG.aws.region;
    const method = 'GET';
    const canonicalUri = '/mqtt';

    dayjs.extend(utc)
    const time = dayjs.utc();
    const dateStamp = time.format('YYYYMMDD');
    const amzdate = `${dateStamp}T${time.format('HHmmss')}Z`;

    const {
      credentials: {
        secretAccessKey: secretAccessKey,
        accessKeyId: accessKeyId,
        sessionToken: sessionToken
      } = {},
      identityId: clientId
    } = sessionData;

    console.log("secretAccessKey", secretAccessKey);
    console.log("accessKeyId", accessKeyId);
    console.log("sessionToken", sessionToken);
    console.log("clientId", clientId);

    // Set credential scope to today for a specific service in a specific region
    var credentialScope = dateStamp + '/' + region + '/' + service + '/' + 'aws4_request';

    // Start populating the query string
    var canonicalQuerystring = 'X-Amz-Algorithm=AWS4-HMAC-SHA256';

    // Add credential information
    canonicalQuerystring += '&X-Amz-Credential=' + encodeURIComponent(accessKeyId + '/' + credentialScope);

    // Add current date
    canonicalQuerystring += '&X-Amz-Date=' + amzdate;

    // Add expiry date
    canonicalQuerystring += '&X-Amz-Expires=86400';

    // Add headers, only using one = host
    canonicalQuerystring += '&X-Amz-SignedHeaders=host';
    var canonicalHeaders = 'host:' + host + '\n';

    // No payload, empty
    var payloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // empty string -> echo -n "" | xxd  | shasum -a 256

    // Build canonical request
    var canonicalRequest = method + '\n' + canonicalUri + '\n' + canonicalQuerystring + '\n' + canonicalHeaders + '\nhost\n' + payloadHash;
    console.log('canonicalRequest: \n' + canonicalRequest);

    // Hash the canonical request and create the message to be signed
    var stringToSign = algorithm + '\n' +  amzdate + '\n' +  credentialScope + '\n' +  this.sigV4Service.sha256(canonicalRequest);

    // Derive the key to be used for the signature based on the scoped down request
    var signingKey = this.sigV4Service.getSignatureKey(secretAccessKey!, dateStamp, region, service);
    console.log('stringToSign: \n'); console.log(stringToSign);
    console.log('signingKey: \n'); console.log(signingKey);

    // Calculate signature
    var signature = this.sigV4Service.sign(signingKey, stringToSign);

    // Append signature to message
    canonicalQuerystring += '&X-Amz-Signature=' + signature;

    // Append existing security token to the request (since we are using STS credetials) or do nothing if using IAM credentials
    if (sessionToken !== "") {
      canonicalQuerystring += '&X-Amz-Security-Token=' + encodeURIComponent(sessionToken!);  
    } 
    
    const requestUrl = 'wss://' + host + canonicalUri + '?' + canonicalQuerystring;

    console.log('-------------------------');
    console.dir(requestUrl);
    console.log('-------------------------');

    this.client = mqtt.connect(requestUrl, {
      clientId: clientId,
      protocolId: 'MQTT',
      protocolVersion: 4,
      port: 443,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
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
      // Subscribe to topics and handle messages
      // this.client?.subscribe('company/ACME/events');
      // this.client?.subscribe(`company/${sessionData.tokens?.idToken?.payload['custom:Company']}/events`);
      this.client?.subscribe(`companies/${sessionData.tokens?.idToken?.payload['custom:Company']}/events`);

      console.log(`companies/${String(sessionData.tokens?.idToken?.payload['custom:Company']).toLocaleLowerCase()}/events`);
      
    });

    this.client.on('message', (topic, message) => {
      console.log(`MQTT broker received the following message: ${message.toString()} on topic: ${topic}`);
      try {
        const parsedMessage = JSON.parse(message.toString()) as MqttMessage;
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

}
