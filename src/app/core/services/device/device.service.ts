import { Injectable, Inject, NgZone } from '@angular/core';
import { APP_CONFIG } from '../../../../environments/environment';
import { v4 as uuidv4 } from "uuid";
import { WINDOW } from '../../tokens/window';
import { PortInfo } from '@serialport/bindings-cpp';
import { DeviceIncomingData,
         DeviceAppState,
         DeviceMessageType,
         WiFiNetwork } from '../../../../../app/shared/models';
import { PendingRequest } from '../../models';
import { AlarmPayload, DeviceConfiguration, BaseMqttMessage } from '../../models';
import { BehaviorSubject, distinctUntilChanged, Observable } from 'rxjs';
import { USBCommandType } from '../../../../../app/shared/models';
import { titleStyle } from '../../../shared/helpers/console.helper';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {

  private pendingRequests: Record<string, PendingRequest<any>> = {};

  public readonly serialNumber: BehaviorSubject<string> =
      new BehaviorSubject<string>('');
  public readonly portInfo: BehaviorSubject<Nullable<PortInfo>> =
      new BehaviorSubject<Nullable<PortInfo>>(null);
  public readonly deviceAppStatus: BehaviorSubject<Nullable<DeviceAppState>> =
      new BehaviorSubject<Nullable<DeviceAppState>>(DeviceAppState.STARTED);
  public readonly usbConnectionStatus: BehaviorSubject<boolean> =
      new BehaviorSubject<boolean>(false);
  public readonly wiFiNetworks: BehaviorSubject<WiFiNetwork[]> =
      new BehaviorSubject<WiFiNetwork[]>([]);
  public readonly configuration: BehaviorSubject<Nullable<DeviceConfiguration>> =
      new BehaviorSubject<Nullable<DeviceConfiguration>>(null);
  public readonly alarm: BehaviorSubject<Nullable<BaseMqttMessage<AlarmPayload>>> =
      new BehaviorSubject<Nullable<BaseMqttMessage<AlarmPayload>>>(null);
  public readonly error: BehaviorSubject<Nullable<DeviceIncomingData>> =
      new BehaviorSubject<Nullable<DeviceIncomingData>>(null);

  public readonly serialNumber$: Observable<string> = 
      this.serialNumber.asObservable();
  public readonly portInfo$: Observable<Nullable<PortInfo>> =
      this.portInfo.asObservable();
  public readonly deviceAppStatus$: Observable<Nullable<DeviceAppState>> =
      this.deviceAppStatus.asObservable();
  public readonly usbConnectionStatus$: Observable<boolean> =
      this.usbConnectionStatus.asObservable();
  public readonly wiFiNetworks$: Observable<WiFiNetwork[]> =
      this.wiFiNetworks.asObservable();
  public readonly configuration$: Observable<Nullable<DeviceConfiguration>> =
      this.configuration.asObservable();
  public readonly alarm$: Observable<Nullable<BaseMqttMessage<AlarmPayload>>> =
      this.alarm.asObservable();
  public readonly error$: Observable<Nullable<DeviceIncomingData>> =
      this.error.asObservable();

  constructor(@Inject(WINDOW) private win: Window,
                              private ngZone: NgZone) {

    console.log('DeviceService created!');

    if (win.electron) {
      
      win.electron.ipcRenderer.on('device-found', (data: PortInfo) => {
        this.ngZone.run(() => {
          console.log('[ANGULAR APP] Device found:', data);
          this.portInfo.next(data);
        });
      });
  
      win.electron.ipcRenderer.on('device-connection-status-update', (data: boolean) => {
        this.ngZone.run(() => {
          console.log('[ANGULAR APP] Device connection status update:', data);
          this.usbConnectionStatus.next(data);
        }); 
      });

      win.electron.ipcRenderer.on('device-incoming-data', (data: DeviceIncomingData) => {
        this.ngZone.run(() => {
          console.log('[ANGULAR APP] Device incoming data:', data);
          this.parseIncomingData(data);
        });
      });

    }

    this.usbConnectionStatus
        .pipe(distinctUntilChanged())
        .subscribe(status => {
          console.log('USB connection status changed:', status);
          if (!status) this.reset();
        });
    
  }

  public parseIncomingData(payload: DeviceIncomingData) {

    if (!this.serialNumber.getValue() && payload.sn) {
      this.serialNumber.next(payload.sn);
    }

    const correlationId = payload.cid;
  
    if(correlationId && this.pendingRequests[correlationId]) {
      const { resolve, timeout } = this.pendingRequests[correlationId];
      clearTimeout(timeout);
      // TO DO: reject here messages with type == DeviceMessageType.ERROR ?
      resolve(payload);
      delete this.pendingRequests[correlationId];
    }

    switch (payload.type) {
      case DeviceMessageType.APP_STATE:
        this.deviceAppStatus.next(payload.data?.appState as DeviceAppState);
        break;
      case DeviceMessageType.WIFI_NETWORKS_LIST:
        this.wiFiNetworks.next(payload.data as WiFiNetwork[]);
        break;
      case DeviceMessageType.ERROR:
        console.log("INCOMING ERROR:", payload.data);
        this.error.next(payload);
        break;
      case DeviceMessageType.ACKNOWLEDGMENT:
        console.log(`Received response via USB for request with correlation id: ${correlationId}`);
        break;
    }

  }

  public sendData(payload: any) {

    let jsonPayload;

    try {

      jsonPayload = JSON.stringify(payload);

      if (this.win.electron) {
        console.log(`Sending data to device: ${jsonPayload}`);
        this.win.electron.ipcRenderer.send('device-send-data', `<|${jsonPayload}|>`);
      } else {
        console.error('Error while sending data to device: Electron not available!');
      }
      
    } catch (error) {

      console.error('Error sending data to device:', error);

    }

  }

  public async asyncSendData(type: USBCommandType, payload: any): Promise<any> {

    return new Promise<any>((resolve, reject) => {

      const cid = this.generateCid();

      this.pendingRequests[cid] = {
        resolve: resolve as (data: any) => void,
        reject,
        timeout: setTimeout(() => {
          console.error(`Request ${cid} timed out.`);
          reject(new Error("USB request timeout"));
          delete this.pendingRequests[cid];
        }, APP_CONFIG.settings.USB_RESPONSE_TIMEOUT),
      };

      this.sendData({
        cid,
        commandType: type,
        payload
      });

      console.log('%USB request sent:', titleStyle);
      console.log(`Request sent with correlation id: ${cid}`);
      console.log('Pending requests:', Object.keys(this.pendingRequests).length);
      console.log(this.pendingRequests);

    });

  }

  public reset() {

    this.serialNumber.next('');
    this.portInfo.next(null);
    this.deviceAppStatus.next(DeviceAppState.STARTED);
    this.wiFiNetworks.next([]);
    this.error.next(null);
    this.alarm.next(null);
    this.configuration.next(null);

  }

  public generateCid(): string {

    const deviceSN = this.serialNumber.getValue();
    return `${deviceSN}-${uuidv4()}-${Date.now()}`;

  }

  onAlarm(message: Nullable<BaseMqttMessage<AlarmPayload>>) {
    this.alarm.next(message);
  }

  onConfiguration(message: Nullable<DeviceConfiguration>) {
    this.configuration.next(message);
  }

  getSerialNumber(): string {
    return this.serialNumber.getValue();
  }

  getAppStatus(): Nullable<DeviceAppState> {
    return this.deviceAppStatus.getValue();
  }

} 
