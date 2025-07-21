import { Component, OnInit } from '@angular/core';
import { DeviceAppState } from '../../../../../app/shared';
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
import { TranslatePipe } from '@ngx-translate/core';
import { DeviceConnectionStatusService } from '../../../core/services/device-connection-status/device-connection-status.service';
import { Observable, switchMap } from 'rxjs';

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
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS
  ]
})
export class DeviceControlComponent implements OnInit {

  public readonly deviceAppState = DeviceAppState;
  public readonly isBusy$ = this.deviceConfigurationService.isBusy$;
  public readonly settings$ = this.deviceConfigurationService.properties$;
  public readonly serialNumber$ = this.deviceService.serialNumber$;
  public sliderValue: number = 0;

  constructor(
    public readonly mqttService: MqttService,
    private deviceService: DeviceService,
    private deviceConfigurationService: DeviceConfigurationService,
    private deviceConnectionStatusService: DeviceConnectionStatusService
  ) {

    this.deviceConfigurationService
        .properties$
        .pipe(takeUntilDestroyed())
        .subscribe((configuration) => {
      if (configuration) {
        this.sliderValue = Number(configuration.distance);
      }
    });

    this.isConnected$
        .pipe(takeUntilDestroyed())
        .subscribe((connected) => {
      if (connected) {
        this.deviceConfigurationService
            .loadSettings()
            .finally();
      }
    });

  };

  ngOnInit(): void {

    console.log('DeviceControlComponent INIT');

  }

  get isConnected$(): Observable<boolean> {

    return this.deviceService.serialNumber$.pipe(
      switchMap(serialNumber => 
        this.deviceConnectionStatusService.onChange(serialNumber)
      )
    );

  }

}
