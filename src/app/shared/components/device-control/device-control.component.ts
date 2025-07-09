import { Component, OnInit } from '@angular/core';
import { DeviceAppState } from '../../../../../app/shared/models';
import { MqttService } from '../../../core/services/mqtt/mqtt.service';
import { ConnectionStatusComponent } from '../connection-status/connection-status.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DeviceConfigurationService } from '../../../core/services/device-configuration/device-configuration.service';
import { BeaconUrlFormComponent } from '../beacon-url-form/beacon-url-form.component';
import { DeviceService } from '../../../core/services/device/device.service';
import { SettingsTableComponent } from '../settings-table/settings-table.component';
import { DistanceSliderComponent } from '../distance-slider/distance-slider.component';
import { COMMON_MATERIAL_IMPORTS } from '../../utils/material-imports';
import { AsyncPipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-device-control',
  templateUrl: './device-control.component.html',
  styleUrls: ['./device-control.component.scss'],
  imports: [
    CommonModule,
    AsyncPipe,
    ConnectionStatusComponent,
    BeaconUrlFormComponent,
    SettingsTableComponent,
    DistanceSliderComponent,
    ...COMMON_MATERIAL_IMPORTS
  ]
})
export class DeviceControlComponent implements OnInit {

  public readonly deviceAppState = DeviceAppState;
  public readonly isBusy$ = this.deviceConfigurationService.isBusy$;
  public readonly settings$ = this.deviceConfigurationService.settings$;
  public readonly serialNumber$ = this.deviceService.serialNumber$;
  public sliderValue: number = 0;

  constructor(
    public readonly mqttService: MqttService,
    private deviceService: DeviceService,
    private deviceConfigurationService: DeviceConfigurationService
  ) {

    this.deviceConfigurationService
        .settings$
        .pipe(takeUntilDestroyed())
        .subscribe((configuration) => {
      if (configuration) {
        this.sliderValue = Number(configuration.distance);
      }
    });

  };

  ngOnInit(): void {

  this.deviceConfigurationService
      .loadSettings()
      .finally();

    console.log('DeviceControlComponent INIT');

  }

}
