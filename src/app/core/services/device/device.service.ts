import { Injectable, Inject, NgZone } from '@angular/core';
import { APP_CONFIG } from '../../../../environments/environment';
import { v4 as uuidv4 } from "uuid";
import { WINDOW } from '../shared/window';
import { PortInfo } from '@serialport/bindings-cpp';
import { DeviceIncomingData,
         DeviceAppState,
         DeviceMessageType,
         WiFiNetwork,
         DeviceErrorType,
         PendingRequest} from '@shared/models';
import { AlarmPayload } from '../mqtt/mqtt.service';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { DeviceConfiguration, BaseMqttMessage } from '../mqtt/mqtt.service';
import { USBCommandType } from '../../../../../shared/models';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {

  private pendingRequests: Record<string, PendingRequest<any>> = {};

  public readonly serialNumber$: BehaviorSubject<string> =
      new BehaviorSubject<string>('');
  public readonly portInfo$: BehaviorSubject<Nullable<PortInfo>> =
      new BehaviorSubject<Nullable<PortInfo>>(null);
  public readonly deviceAppStatus$: BehaviorSubject<Nullable<DeviceAppState>> =
      new BehaviorSubject<Nullable<DeviceAppState>>(DeviceAppState.STARTED);
  public readonly usbConnectionStatus$: BehaviorSubject<boolean> =
      new BehaviorSubject<boolean>(false);
  public readonly wiFiNetworks$: BehaviorSubject<WiFiNetwork[]> =
      new BehaviorSubject<WiFiNetwork[]>([]);
  public readonly configuration$: BehaviorSubject<Nullable<DeviceConfiguration>> =
      new BehaviorSubject<Nullable<DeviceConfiguration>>(null);
  public readonly alarm$: BehaviorSubject<Nullable<BaseMqttMessage<AlarmPayload>>> =
      new BehaviorSubject<Nullable<BaseMqttMessage<AlarmPayload>>>(null);
  public readonly error$: BehaviorSubject<DeviceErrorType> =
      new BehaviorSubject<DeviceErrorType>(DeviceErrorType.NONE);

  constructor(@Inject(WINDOW) private win: Window,
                              private ngZone: NgZone) {

    console.log('DeviceService created!');

    if (win.electron) {
      
      win.electron.ipcRenderer.on('device-found', (data) => {
        this.ngZone.run(() => {
          console.log('[ANGULAR APP] Device found:', data);
          this.portInfo$.next(data as PortInfo);
        });
      });
  
      win.electron.ipcRenderer.on('device-connection-status-update', (data) => {
        this.ngZone.run(() => {
          console.log('[ANGULAR APP] Device connection status update:', data);
          this.usbConnectionStatus$.next(data as boolean);
        }); 
      });

      win.electron.ipcRenderer.on('device-incoming-data', (data) => {
        this.ngZone.run(() => {
          console.log('[ANGULAR APP] Device incoming data:', data);
          this.parseIncomingData(data as DeviceIncomingData);
        });
      });

    }

    this.usbConnectionStatus$
        .pipe(
          distinctUntilChanged()
        )
        .subscribe(status => {
          // This will only be called when the value of `status` changes
          console.log('USB connection status changed:', status);
          if (!status) {
            this.reset();
          }
      });
    
  }

  public parseIncomingData(payload: DeviceIncomingData) {

    if (!this.serialNumber$.getValue() && payload.sn) {
      this.serialNumber$.next(payload.sn);
    }

    const correlationId = payload.cid;
  
    if(correlationId && this.pendingRequests[correlationId]) {
      const { resolve, timeout } = this.pendingRequests[correlationId];
      clearTimeout(timeout);
      resolve(payload);
      delete this.pendingRequests[correlationId];
    }

    switch (payload.type) {
      case DeviceMessageType.APP_STATE:
        this.deviceAppStatus$.next(payload.data?.appState as DeviceAppState);
        break;
      case DeviceMessageType.WIFI_NETWORKS_LIST:
        this.wiFiNetworks$.next(payload.data as WiFiNetwork[]);
        break;
      case DeviceMessageType.ERROR:
        console.log("INCOMING ERROR:", payload.data);
        this.error$.next(payload.data?.error as DeviceErrorType);
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

      console.log(this.pendingRequests);

    });

  }

  public reset() {

    this.serialNumber$.next('');
    this.portInfo$.next(null);
    this.deviceAppStatus$.next(DeviceAppState.STARTED);
    this.wiFiNetworks$.next([]);
    this.error$.next(DeviceErrorType.NONE);
    this.alarm$.next(null);
    this.configuration$.next(null);

  }

  public generateCid(): string {

    const deviceSN = this.serialNumber$.getValue();
    return `${deviceSN}-${uuidv4()}-${Date.now()}`;

  }

} 
