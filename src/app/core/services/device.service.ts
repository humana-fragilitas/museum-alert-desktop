import { Injectable, Inject, NgZone } from '@angular/core';
import { environment } from '../../environments/environment';
import { WINDOW } from './shared/window';
import { PortInfo } from '@serialport/bindings-cpp';
import { DeviceIncomingData,
         DeviceAppState,
         DeviceMessageType,
         WiFiNetwork,
         AlarmPayload, 
         DeviceErrorType} from '@shared/models';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {

  public readonly portInfo$: BehaviorSubject<Nullable<PortInfo>> =
      new BehaviorSubject<Nullable<PortInfo>>(null);
  public readonly deviceAppStatus$: BehaviorSubject<Nullable<DeviceAppState>> =
      new BehaviorSubject<Nullable<DeviceAppState>>(null);
  public readonly connectionStatus$: BehaviorSubject<boolean> =
      new BehaviorSubject<boolean>(false);
  public readonly wiFiNetworks$: BehaviorSubject<WiFiNetwork[]> =
      new BehaviorSubject<WiFiNetwork[]>([]);

  constructor(@Inject(WINDOW) private window: Window, private ngZone: NgZone) {

    console.log('DeviceService created!');

    if (window.electron) {
      
      window.electron.ipcRenderer.on('device-found', (data) => {
        this.ngZone.run(() => {
          console.log('[ANGULAR APP] Device found:', data);
          this.portInfo$.next(data as PortInfo);
        });
      });
  
      window.electron.ipcRenderer.on('device-connection-status-update', (data) => {
        this.ngZone.run(() => {
          console.log('[ANGULAR APP] Device connection status update:', data);
          this.connectionStatus$.next(data as boolean);
        });
      });

      window.electron.ipcRenderer.on('device-incoming-data', (data) => {
        this.ngZone.run(() => {
          console.log('[ANGULAR APP] Device incoming data:', data);
          this.parseIncomingData(data as DeviceIncomingData);
        });
      });

    }

    // Example: send data to main process
    // window.electron!.ipcRenderer.send('renderer-to-main', { msg: 'Hello from Angular!' });
    
  }

  private parseIncomingData(payload: DeviceIncomingData) {

    switch (payload.type) {
      case DeviceMessageType.APP_STATE:
        this.deviceAppStatus$.next(payload.data?.appState as DeviceAppState);
        break;
      case DeviceMessageType.WIFI_NETWORKS_LIST:
        this.wiFiNetworks$.next(payload.data as WiFiNetwork[]);
        break;
      case DeviceMessageType.ERROR:
        //this.error = payload.data as DeviceErrorType;
        // TO DO: manage error snackbar
        break;
    }

  }

} 
