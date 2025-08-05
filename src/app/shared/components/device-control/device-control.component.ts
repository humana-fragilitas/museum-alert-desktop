import { Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { Component,
         OnInit,
         OnDestroy,
         computed,
         signal,
         effect } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DeviceAppState } from '@shared-with-electron';
import { MqttService } from '@services/mqtt/mqtt.service';
import { ConnectionStatusComponent } from '@shared/components/connection-status/connection-status.component';
import { DeviceConfigurationService } from '@services/device-configuration/device-configuration.service';
import { BeaconUrlFormComponent } from '@shared/components/beacon-url-form/beacon-url-form.component';
import { DeviceService } from '@services/device/device.service';
import { SettingsTableComponent } from '@shared/components/settings-table/settings-table.component';
import { DistanceSliderComponent } from '@shared/components/distance-slider/distance-slider.component';
import { COMMON_MATERIAL_IMPORTS } from '@shared/utils/material-imports';
import { DeviceConnectionStatusService } from '@services/device-connection-status/device-connection-status.service';


@Component({
  selector: 'app-device-control',
  templateUrl: './device-control.component.html',
  styleUrls: ['./device-control.component.scss'],
  imports: [
    CommonModule,
    ConnectionStatusComponent,
    BeaconUrlFormComponent,
    SettingsTableComponent,
    DistanceSliderComponent,
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS
  ]
})
export class DeviceControlComponent implements OnInit, OnDestroy {
  
  private connectionStatus = signal<boolean>(false);
  private connectionSubscription?: Subscription;

  readonly deviceAppState = DeviceAppState;
  readonly isBusy = this.deviceConfigurationService.isBusy;
  readonly settings = this.deviceConfigurationService.settings;
  readonly serialNumber = this.deviceService.serialNumber;
  readonly isConnected = computed(() => this.connectionStatus());
  sliderValue = signal<number>(0);

  constructor(
    public readonly mqttService: MqttService,
    private deviceService: DeviceService,
    private deviceConfigurationService: DeviceConfigurationService,
    private deviceConnectionStatusService: DeviceConnectionStatusService
  ) {

    effect(() => {
      const configuration = this.settings();
      if (configuration) {
        this.sliderValue.set(Number(configuration.distance));
      }
    });


    effect(() => {
      const sn = this.serialNumber();
      if (this.connectionSubscription) {
        this.connectionSubscription.unsubscribe();
        this.connectionSubscription = undefined;
      }

      if (sn) {
        this.connectionSubscription = this.deviceConnectionStatusService
          .onChange(sn)
          .subscribe(connected => {
            this.connectionStatus.set(connected);
          });
      } else {
        this.connectionStatus.set(false);
      }
    });

    effect(() => {
      const connected = this.isConnected();
      if (connected) {
        this.deviceConfigurationService
          .loadSettings()
          .finally();
      }
    });
    
  }

  ngOnInit(): void {
    console.log('DeviceControlComponent INIT');
  }

  ngOnDestroy(): void {
    if (this.connectionSubscription) {
      this.connectionSubscription.unsubscribe();
    }
  }

}