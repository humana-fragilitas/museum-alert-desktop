import { distinctUntilChanged, map, Observable } from 'rxjs';

import { Injectable, signal, computed, effect, untracked } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

import { MqttService } from '@services/mqtt/mqtt.service';
import { AlarmPayload, BaseMqttMessage, ConnectionStatus, DeviceConfiguration, MqttMessageType } from '@models';
import { DeviceService } from '@services/device/device.service';
import { DeviceErrorMessage, DeviceErrorType } from '@shared-with-electron';


@Injectable({
  providedIn: 'root'
})
export class DeviceConnectionStatusService {
  
  private readonly devicesConnectionStatusSignal = signal<Map<string, boolean>>(new Map());
  private readonly devicesConnectionStatus$ = toObservable(this.devicesConnectionStatusSignal);
  private readonly deviceErrorSignal = this.deviceService.error;

  constructor(
    private readonly deviceService: DeviceService,
    private readonly mqttService: MqttService
  ) {
    
    this.mqttService.onMessageOfType([
      MqttMessageType.ALARM,
      MqttMessageType.CONFIGURATION,
      MqttMessageType.ACKNOWLEGDE,
      MqttMessageType.CONNECTION_STATUS
    ]).subscribe((message: BaseMqttMessage<ConnectionStatus | AlarmPayload | DeviceConfiguration | void>) => {
      
      const currentMap = this.devicesConnectionStatusSignal();
      const newMap = new Map(currentMap);
      
      if (message.type === MqttMessageType.CONNECTION_STATUS) {
        newMap.set(message.sn, (message.data as ConnectionStatus).connected);
      } else {
        newMap.set(message.sn, true);
      }
      
      this.devicesConnectionStatusSignal.set(newMap);
      console.log(`Received message via MQTT from device with SN: ${message.sn}; ` +
        `updating devices connection status map:`, newMap);

    });

    effect(() => {
      const message = this.deviceErrorSignal() as DeviceErrorMessage;
      
      if (message && message.data.error === DeviceErrorType.FAILED_SENSOR_DETECTION_REPORT) {
        // Use untracked() to read the signal without creating a dependency
        const currentMap = untracked(() => this.devicesConnectionStatusSignal());
        const newMap = new Map(currentMap);
        newMap.set(message.sn, false);
        this.devicesConnectionStatusSignal.set(newMap);
        console.log(`Received error via USB from device with SN: ${message.sn}; ` +
          `updating devices connection status map:`, newMap);
      }
    });

  }

  /**
   * Get connection status observable for a specific device
   * @param deviceSN - Device serial number
   * @returns Observable<boolean> - Connection status (defaults to false if not found)
   */
  onChange(deviceSN: string): Observable<boolean> {
    return this.devicesConnectionStatus$.pipe(
      map((statusMap: Map<string, boolean>) => statusMap.get(deviceSN) ?? false),
      distinctUntilChanged()
    );
  }

  /**
   * Get connection status as a computed signal for a specific device
   * @param deviceSN - Device serial number
   * @returns Signal<boolean> - Connection status (defaults to false if not found)
   */
  getConnectionStatus(deviceSN: string) {
    return computed(() => {
      const statusMap = this.devicesConnectionStatusSignal();
      return statusMap.get(deviceSN) ?? false;
    });
  }

}