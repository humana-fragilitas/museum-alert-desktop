import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { MqttService } from '../../../core/services/mqtt/mqtt.service';
import { DeviceService } from '../../../core/services/device/device.service';
import { 
  distinctUntilChanged, 
  map, 
  Observable, 
  merge,
  startWith,
  takeUntil,
  Subject,
  filter
} from 'rxjs';
import { CommonModule } from '@angular/common';
import { COMMON_MATERIAL_IMPORTS } from '../../utils/material-imports';
import { TranslatePipe } from '@ngx-translate/core';
import { 
  MqttMessageType 
} from '../../../core/models'; // Adjust import path as needed

import { DeviceErrorType } from '../../../../../app/shared/models';

@Component({
  selector: 'app-connection-status',
  templateUrl: './connection-status.component.html',
  styleUrls: ['./connection-status.component.scss'],
  imports: [
    CommonModule,
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS
  ]
})
export class ConnectionStatusComponent implements OnInit, OnDestroy {
  @Input() deviceSN: string = '';
  
  public deviceConnectionStatus$!: Observable<boolean>;
  private destroy$ = new Subject<void>();
  
  constructor(
    public readonly mqttService: MqttService,
    private readonly deviceService: DeviceService
  ) {}

  ngOnInit(): void {
    console.log('ConnectionStatusComponent INIT');
    this.setupConnectionStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupConnectionStatus(): void {
    // 1. MQTT connection status events
    const mqttConnectionEvents$ = this.mqttService.devicesConnectionStatus$.pipe(
      map((statusMap: Map<string, boolean>) => {
        const status = statusMap.get(this.deviceSN) ?? false;
        console.log(`Device ${this.deviceSN} MQTT connection event: ${status}`);
        return { type: 'mqtt', connected: status };
      })
    );

    // 2. Successful MQTT message events (proves connection)
    const messageSuccessEvents$ = this.getMessageSuccessEvents();

    // 3. USB error events (indicates connection failure)
    const usbErrorEvents$ = this.getUsbErrorEvents();

    // 4. Merge all events in chronological order and map to connection status
    this.deviceConnectionStatus$ = merge(
      mqttConnectionEvents$,
      messageSuccessEvents$,
      usbErrorEvents$
    ).pipe(
      map((event) => {
        console.log(`Device ${this.deviceSN} connection event:`, event);
        return event.connected;
      }),
      startWith(false),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    );
  }

  private getMessageSuccessEvents(): Observable<{ type: string; connected: boolean }> {
    const alarmMessages$ = this.mqttService.onMessageOfType(MqttMessageType.ALARM, this.deviceSN);
    const configMessages$ = this.mqttService.onMessageOfType(MqttMessageType.CONFIGURATION, this.deviceSN);
    const ackMessages$ = this.mqttService.onMessageOfType(MqttMessageType.ACK, this.deviceSN);

    return merge(alarmMessages$, configMessages$, ackMessages$).pipe(
      map(() => {
        console.log(`Message received from alarm sensor ${this.deviceSN} - connection confirmed`);
        return { type: 'message', connected: true };
      }),
      takeUntil(this.destroy$)
    );
  }

  private getUsbErrorEvents(): Observable<{ type: string; connected: boolean }> {
    return this.deviceService.error$.pipe(
      map((error) => {
        if (error === DeviceErrorType.FAILED_SENSOR_DETECTION_REPORT) {
          console.log(`USB error: ${this.deviceSN} cannot send MQTT messages - connection failed`);
          return { type: 'usb_error', connected: false };
        }
        
        // If error is cleared (null), we don't emit an event
        // Let other events determine the connection status
        return null;
      }),
      filter((event): event is { type: string; connected: boolean } => event !== null),
      takeUntil(this.destroy$)
    );
  }
}