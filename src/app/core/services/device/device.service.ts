import { v4 as uuidv4 } from 'uuid';
import { PortInfo } from '@serialport/bindings-cpp';

import { Injectable, Inject, NgZone, signal, effect } from '@angular/core';

import { APP_CONFIG } from '@env/environment';
import { WINDOW } from '@tokens/window';
import { DeviceIncomingData,
         DeviceAppState,
         DeviceMessageType,
         WiFiNetwork, 
         DeviceEvent,
         DeviceOutgoingData,
         DeviceErrorType,
        USBCommandType } from '@shared-with-electron';
import { PendingRequest, AlarmPayload, DeviceConfiguration, BaseMqttMessage } from '@models';
import { titleStyle } from '@shared/helpers/console.helper';

export class USBCommandTimeoutException extends Error {
  constructor(public error: string) {
    super(error);
    this.name = 'USBCommandTimeoutException';
  }
}

export class USBCommandDeviceException extends Error {

  public readonly error: DeviceErrorType;

  constructor(deviceError: { cid?: string, type: DeviceMessageType.ERROR; sn: string, data: { error: DeviceErrorType } }) {
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
  readonly wiFiNetworks = this.wiFiNetworksSignal.asReadonly();
  readonly currentConfiguration = this.configurationSignal.asReadonly();
  readonly portInfo = this.portInfoSignal.asReadonly();
  readonly deviceAppStatus = this.deviceAppStatusSignal.asReadonly();
  readonly usbConnectionStatus = this.usbConnectionStatusSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly alarm = this.alarmSignal.asReadonly();

  constructor(@Inject(WINDOW) private win: Window,
                              private ngZone: NgZone) {

    console.log('[DeviceService] instance created');

    if (win.electron) {
      
      win.electron.ipcRenderer.on(DeviceEvent.FOUND, (data: PortInfo) => {
        this.ngZone.run(() => {
          console.log('[DeviceService]: device found:', data);
          this.portInfoSignal.set(data); // Use signal instead of BehaviorSubject
        });
      });
  
      win.electron.ipcRenderer.on(DeviceEvent.CONNECTION_STATUS_UPDATE, (data: boolean) => {
        this.ngZone.run(() => {
          console.log('[DeviceService]: received USB connection update from device:', data);
          this.usbConnectionStatusSignal.set(data); // Use signal instead of BehaviorSubject
        }); 
      });

      win.electron.ipcRenderer.on(DeviceEvent.INCOMING_DATA, (data: DeviceIncomingData) => {
        this.ngZone.run(() => {
          console.log('[DeviceService]: received data from device:', data);
          this.parseIncomingData(data);
        });
      });
    }

    // Replace the subscription with an effect to maintain exact same behavior
    effect(() => {
      const status = this.usbConnectionStatusSignal();
      // We need to track the previous value to implement distinctUntilChanged behavior
      // This effect will automatically handle distinctUntilChanged since signals only emit when values change
      console.log('[DeviceService]: USB device connection status changed:', status);
      if (!status) this.reset();
    });
  }

  public parseIncomingData(payload: DeviceIncomingData) {

    if (!this.serialNumberSignal() && payload.sn) { // Use signal instead of getValue()
      this.serialNumberSignal.set(payload.sn); // Use signal instead of BehaviorSubject
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
        this.deviceAppStatusSignal.set(payload.data?.appState as DeviceAppState); // Use signal
        break;
      case DeviceMessageType.WIFI_NETWORKS_LIST:
        console.log(`[DeviceService]: received WiFi networks via USB`, payload.data);
        this.wiFiNetworksSignal.set(payload.data as WiFiNetwork[]); // Use signal
        break;
      case DeviceMessageType.ERROR:
        console.log(`[DeviceService]: received error response via USB with no correlation id:`,  payload.data);
        this.errorSignal.set(payload); // Use signal
        break;
      case DeviceMessageType.ACKNOWLEDGMENT:
        console.log(`[DeviceService]: received acknowledgment via USB for request with correlation id: ${correlationId}`);
        break;
    }
  }

  public async sendUSBCommand(type: USBCommandType, payload: DeviceOutgoingData | null = null): Promise<DeviceIncomingData | void> {

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

        if (this.win.electron) {
          console.log(`[DeviceService]: sending data to device: ${jsonPayload}`);
          this.win.electron.ipcRenderer.send(DeviceEvent.OUTGOING_DATA, `<|${jsonPayload}|>`);
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

  public reset() {
    // Use signals instead of BehaviorSubjects
    this.serialNumberSignal.set('');
    this.portInfoSignal.set(null);
    this.deviceAppStatusSignal.set(DeviceAppState.STARTED);
    this.wiFiNetworksSignal.set([]);
    this.errorSignal.set(null);
    this.alarmSignal.set(null);
    this.configurationSignal.set(null);
  }

  public generateCid(): string {
    const deviceSN = this.serialNumberSignal(); // Use signal instead of getValue()
    return `${deviceSN}-${uuidv4()}-${Date.now()}`;
  }

  onAlarm(message: Nullable<BaseMqttMessage<AlarmPayload>>) {
    this.alarmSignal.set(message); // Use signal instead of BehaviorSubject
  }

  onConfiguration(message: Nullable<DeviceConfiguration>) {
    this.configurationSignal.set(message); // Use signal instead of BehaviorSubject
  }

  // Keep these methods for backward compatibility but also provide signal access
  getSerialNumber(): string {
    return this.serialNumberSignal(); // Use signal instead of getValue()
  }

  getAppStatus(): Nullable<DeviceAppState> {
    return this.deviceAppStatusSignal(); // Use signal instead of getValue()
  }
}