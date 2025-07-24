import { Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { Component,
         OnInit,
         OnDestroy,
         computed,
         signal,
         effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';

import { DeviceAppState } from '@shared-with-electron/.';
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
  public readonly deviceAppState = DeviceAppState;

  // Convert observables to signals with proper initial values
  public readonly isBusy = this.deviceConfigurationService.isBusy;
  public readonly settings = this.deviceConfigurationService.properties;
  public readonly serialNumber = this.deviceService.serialNumber;

  // Signal for connection status
  private connectionStatus = signal<boolean>(false);
  public readonly isConnected = computed(() => this.connectionStatus());
  public sliderValue = signal<number>(0);

  private connectionSubscription?: Subscription;

  constructor(
    public readonly mqttService: MqttService,
    private deviceService: DeviceService,
    private deviceConfigurationService: DeviceConfigurationService,
    private deviceConnectionStatusService: DeviceConnectionStatusService
  ) {
    // Replace subscription with effect for configuration changes
    effect(() => {
      const configuration = this.settings();
      if (configuration) {
        this.sliderValue.set(Number(configuration.distance));
      }
    });

    // Handle connection status subscription with effect
    effect(() => {
      const sn = this.serialNumber();
      
      // Clean up previous subscription
      if (this.connectionSubscription) {
        this.connectionSubscription.unsubscribe();
        this.connectionSubscription = undefined;
      }

      if (sn) {
        // Create new subscription when serial number changes
        this.connectionSubscription = this.deviceConnectionStatusService
          .onChange(sn)
          .subscribe(connected => {
            this.connectionStatus.set(connected);
          });
      } else {
        this.connectionStatus.set(false);
      }
    });

    // Replace subscription with effect for connection status changes
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