import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map, Observable } from 'rxjs';
import { MqttService } from '../mqtt/mqtt.service';
import { AlarmPayload, BaseMqttMessage, ConnectionStatus, DeviceConfiguration, MqttMessageType } from '../../models';
import { DeviceService } from '../device/device.service';
import { DeviceErrorType, DeviceIncomingData } from '../../../../../app/shared';

@Injectable({
  providedIn: 'root'
})
export class DeviceConnectionStatusService {

  private readonly devicesConnectionStatus: BehaviorSubject<Map<string, boolean>> =
    new BehaviorSubject<Map<string, boolean>>(new Map());
    
  public readonly devicesConnectionStatus$: Observable<Map<string, boolean>> =
    this.devicesConnectionStatus.asObservable();

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
      const currentMap = this.devicesConnectionStatus.getValue();
      const newMap = new Map(currentMap);
      if (message.type === MqttMessageType.CONNECTION_STATUS) {
        newMap.set(message.sn, (message.data as ConnectionStatus).connected);
      } else {
        newMap.set(message.sn, true);
      }
      this.devicesConnectionStatus.next(newMap);
      console.log(`Received message via MQTT from device with SN: ${message.sn}; ` +
                  `updating devices connection status map:`, newMap);
    });

    this.deviceService.error$.subscribe(
      (message: Nullable<DeviceIncomingData>) => {
        if (message && (message!.data as { error: DeviceErrorType }).error === DeviceErrorType.FAILED_SENSOR_DETECTION_REPORT) {
            const currentMap = this.devicesConnectionStatus.getValue();
            const newMap = new Map(currentMap);
            newMap.set(message.sn, false);
            this.devicesConnectionStatus.next(newMap);
            console.log(`Received error via USB from device with SN: ${message.sn}; ` +
                        `updating devices connection status map:`, newMap);
        }
      }
    );

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
    )
  }

}

