import { v4 as uuidv4 } from 'uuid';
import { PortInfo } from '@serialport/bindings-cpp';

import { Injectable, NgZone, signal, effect } from '@angular/core';

import { APP_CONFIG } from '@env/environment';
import { DeviceIncomingData,
         DeviceAppState,
         DeviceMessageType,
         WiFiNetwork, 
         DeviceEvent,
         DeviceOutgoingData,
         DeviceErrorType,
         USBCommandType, 
         DeviceErrorMessage } from '@shared-with-electron';
import { PendingRequest, AlarmPayload, DeviceConfiguration, BaseMqttMessage } from '@models';
import { titleStyle } from '@shared/helpers/console.helper';
import { ElectronService } from '@services/electron/electron.service';


export class USBCommandTimeoutException extends Error {
  constructor(public error: string) {
    super(error);
    this.name = 'USBCommandTimeoutException';
  }
}

export class USBCommandDeviceException extends Error {

  public readonly error: DeviceErrorType;

  constructor(deviceError: DeviceErrorMessage) {
    super(`USB Command Device Error: ${DeviceErrorType[deviceError.data.error]} (SN: ${deviceError.sn})`);
    this.name = 'USBCommandDeviceException';
    this.error = deviceError.data.error;
  }

}

@Injectable({
  providedIn: 'root'
})
export class DeviceService {

  private pendingRequests: Record<string, PendingRequest<DeviceIncomingData | void>> = {};
  private readonly serialNumberSignal = signal<string>('');
  private readonly portInfoSignal = signal<Nullable<PortInfo>>(null);
  private readonly deviceAppStatusSignal = signal<Nullable<DeviceAppState>>(DeviceAppState.STARTED);
  private readonly usbConnectionStatusSignal = signal<boolean>(false);
  private readonly wiFiNetworksSignal = signal<WiFiNetwork[]>([]);
  private readonly configurationSignal = signal<Nullable<DeviceConfiguration>>(null);
  private readonly alarmSignal = signal<Nullable<BaseMqttMessage<AlarmPayload>>>(null);
  private readonly errorSignal = signal<Nullable<DeviceIncomingData>>(null);

  readonly serialNumber = this.serialNumberSignal.asReadonly();
  readonly portInfo = this.portInfoSignal.asReadonly();
  readonly deviceAppStatus = this.deviceAppStatusSignal.asReadonly();
  readonly usbConnectionStatus = this.usbConnectionStatusSignal.asReadonly();
  readonly wiFiNetworks = this.wiFiNetworksSignal.asReadonly();
  readonly currentConfiguration = this.configurationSignal.asReadonly();
  readonly alarm = this.alarmSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  constructor(private electronService: ElectronService,
              private ngZone: NgZone) {

    console.log('[DeviceService] instance created');

    if (this.electronService.isElectron) {
      
      this.electronService.ipcRenderer.on(DeviceEvent.FOUND,
        (_event: any, data: PortInfo) => {
          this.ngZone.run(() => {
            console.log('[DeviceService]: device found:', data);
            this.portInfoSignal.set(data);
          });
        });
  
      this.electronService.ipcRenderer.on(DeviceEvent.CONNECTION_STATUS_UPDATE,
        (_event: any, data: boolean) => {
          this.ngZone.run(() => {
            console.log('[DeviceService]: received USB connection update from device:', data);
            this.usbConnectionStatusSignal.set(data);
          }); 
        });

      this.electronService.ipcRenderer.on(DeviceEvent.INCOMING_DATA,
        (_event: any, data: DeviceIncomingData) => {
          this.ngZone.run(() => {
            console.log('[DeviceService]: received data from device:', data);
            this.parseIncomingData(data);
          });
        });

    }

    effect(() => {
      const status = this.usbConnectionStatusSignal();
      console.log('[DeviceService]: USB device connection status changed:', status);
      if (!status) this.reset();
    });

  }

  parseIncomingData(payload: DeviceIncomingData) {

    if (!this.serialNumberSignal() && payload.sn) {
      this.serialNumberSignal.set(payload.sn);
    }

    const correlationId = payload.cid;
  
    if(correlationId && this.pendingRequests[correlationId]) {
      const { resolve, reject, timeout } = this.pendingRequests[correlationId];
      clearTimeout(timeout);
      /**
       * Note: errors with associated correlation ids are expected to be directly handled by
       * caller objects and should not be retained within this class for further processing
       */
      if (correlationId && payload.type === DeviceMessageType.ERROR) {
        console.log(`[DeviceService]: processed error with correlation id: ${correlationId}`);
        reject(new USBCommandDeviceException(payload));
        return;
      } else {
        resolve(payload);
      }
      delete this.pendingRequests[correlationId];
    }

    switch (payload.type) {
      case DeviceMessageType.APP_STATE:
        console.log(`[DeviceService]: received app state via USB`, payload.data);
        this.deviceAppStatusSignal.set(payload.data?.appState as DeviceAppState);
        break;
      case DeviceMessageType.WIFI_NETWORKS_LIST:
        console.log(`[DeviceService]: received WiFi networks via USB`, payload.data);
        this.wiFiNetworksSignal.set(payload.data as WiFiNetwork[]);
        break;
      case DeviceMessageType.ERROR:
        console.log(`[DeviceService]: received error response via USB with no correlation id:`,  payload.data);
        this.errorSignal.set(payload);
        break;
      case DeviceMessageType.ACKNOWLEDGMENT:
        console.log(`[DeviceService]: received acknowledgment via USB for request with correlation id: ${correlationId}`);
        break;
    }

  }

  async sendUSBCommand(
    type: USBCommandType,
    payload: DeviceOutgoingData | null = null
  ): Promise<DeviceIncomingData | void> {

    return new Promise<DeviceIncomingData | void>((resolve, reject) => {

      const cid = this.generateCid();

      this.pendingRequests[cid] = {
        resolve: resolve as (data: DeviceIncomingData | void) => void,
        reject,
        timeout: setTimeout(() => {
          console.error(`[DeviceService]: request ${cid} timed out.`);
          reject(new USBCommandTimeoutException('USB command timeout'));
          delete this.pendingRequests[cid];
        }, APP_CONFIG.settings.USB_RESPONSE_TIMEOUT),
      };

      try {

        const jsonPayload = JSON.stringify({
          cid,
          commandType: type,
          payload
        });

        if (this.electronService.isElectron) {
          console.log(`[DeviceService]: sending data to device: ${jsonPayload}`);
          this.electronService.ipcRenderer.send(DeviceEvent.OUTGOING_DATA, `<|${jsonPayload}|>`);
        } else {
          console.error('[DeviceService]: error while sending data to device: Electron object not available!');
        }
        
      } catch (error) {

        console.error('[DeviceService]: error while sending data to device:', error);

      }

      console.log('[DeviceService]: %cUSB request sent:', titleStyle);
      console.log(`[DeviceService]: request sent with correlation id: ${cid}`);
      console.log('[DeviceService]: pending requests:', this.pendingRequests);

    });

  }

  reset() {
    this.serialNumberSignal.set('');
    this.portInfoSignal.set(null);
    this.deviceAppStatusSignal.set(DeviceAppState.STARTED);
    this.wiFiNetworksSignal.set([]);
    this.errorSignal.set(null);
    this.alarmSignal.set(null);
    this.configurationSignal.set(null);
  }

  generateCid(): string {
    const deviceSN = this.serialNumberSignal();
    return `${deviceSN}-${uuidv4()}-${Date.now()}`;
  }

  onAlarm(message: Nullable<BaseMqttMessage<AlarmPayload>>) {
    this.alarmSignal.set(message);
  }

  onConfiguration(message: Nullable<DeviceConfiguration>) {
    this.configurationSignal.set(message);
  }

}