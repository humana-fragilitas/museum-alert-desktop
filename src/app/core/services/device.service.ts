import { Injectable, Inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { WINDOW } from './shared/window';
import { PortInfo } from '@serialport/bindings-cpp';
import { DeviceIncomingData,
         DeviceAppState,
         DeviceMessageType,
         WiFiNetwork,
         AlarmPayload } from '@shared/models';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {

  public portInfo?: PortInfo;
  public alarmStatus?: AlarmPayload;
  public deviceAppStatus?: DeviceAppState;
  public connectionStatus: boolean = false;
  public wiFiNetworks: WiFiNetwork[] = [];

  constructor(@Inject(WINDOW) private window: Window) {

    console.log('DeviceService created!');

    if (window.electron) {
      
      window.electron.ipcRenderer.on('device-found', (data) => {
        console.log('[ANGULAR APP] Device found:', data);
        this.portInfo = data as PortInfo;
      });
  
      window.electron.ipcRenderer.on('device-connection-status-update', (data) => {
        console.log('[ANGULAR APP] Device connection status update:', data);
        this.connectionStatus = data as boolean;
      });

      window.electron.ipcRenderer.on('device-incoming-data', (data) => {
        console.log('[ANGULAR APP] Device incoming data:', data);
        this.parseIncomingData(data as DeviceIncomingData);
      });

    }

    // Example: send data to main process
    // window.electron!.ipcRenderer.send('renderer-to-main', { msg: 'Hello from Angular!' });
    
  }

  private parseIncomingData(payload: DeviceIncomingData) {

    switch (payload.type) {
      case DeviceMessageType.APP_STATE:
        this.deviceAppStatus = payload.data as DeviceAppState;
        break;
      case DeviceMessageType.SENSOR_DETECTION:
        this.alarmStatus = payload.data as AlarmPayload;
        break;
      case DeviceMessageType.WIFI_NETWORKS_LIST:
        this.wiFiNetworks = payload.data as WiFiNetwork[];
        break;
    }

  }

} 
