import { Injectable, Inject, NgZone } from '@angular/core';
import { APP_CONFIG } from '../../../../environments/environment';
import { WINDOW } from '../shared/window';
import { PortInfo } from '@serialport/bindings-cpp';
import { DeviceIncomingData,
         DeviceAppState,
         DeviceMessageType,
         WiFiNetwork,
         AlarmPayload, 
         DeviceErrorType} from '@shared/models';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { DeviceConfiguration } from '../mqtt/mqtt.service';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {

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
  public readonly alarm$: BehaviorSubject<AlarmPayload> =
      new BehaviorSubject<AlarmPayload>({ hasAlarm: false, distance: 0 });
  public readonly error$: BehaviorSubject<DeviceErrorType> =
      new BehaviorSubject<DeviceErrorType>(DeviceErrorType.NONE);

  constructor(@Inject(WINDOW) private win: Window, private ngZone: NgZone) {

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

  public reset() {

    this.serialNumber$.next('');
    this.portInfo$.next(null);
    this.deviceAppStatus$.next(DeviceAppState.STARTED);
    this.wiFiNetworks$.next([]);
    this.error$.next(DeviceErrorType.NONE);

  }

} 
