import { Component, OnInit } from '@angular/core';
import { DeviceAppState } from '../../../../../app/shared/models';
import { MqttService } from '../../../core/services/mqtt/mqtt.service';
import { FormatDistancePipe } from '../../pipes/format-distance.pipe';
import { MatCardModule } from '@angular/material/card';
import { AsyncPipe, CommonModule } from '@angular/common';
import { ConnectionStatusComponent } from '../connection-status/connection-status.component';
import { MatSliderModule } from '@angular/material/slider';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { CompanyFormComponent } from '../company-form/company-form.component';
import { DeviceConfigurationService } from '../../../core/services/device-configuration/device-configuration.service';
import { BeaconUrlFormComponent } from '../beacon-url-form/beacon-url-form.component';
import { DeviceService } from '../../../core/services/device/device.service';
import { SettingsTableComponent } from '../settings-table/settings-table.component';
import { DistanceSliderComponent } from '../distance-slider/distance-slider.component';

@Component({
  selector: 'app-device-control',
  templateUrl: './device-control.component.html',
  styleUrls: ['./device-control.component.scss'],
  providers: [FormatDistancePipe],
  imports: [
    FormsModule,
    MatCardModule,
    AsyncPipe,
    ConnectionStatusComponent,
    BeaconUrlFormComponent,
    SettingsTableComponent,
    DistanceSliderComponent,
    MatSliderModule,
    FormatDistancePipe,
    CommonModule,
    MatProgressSpinnerModule
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
    private formatDistancePipe: FormatDistancePipe,
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

  onSliderChange(distance: number) {

    this.sliderValue = Number(distance);

    console.log(`Setting minimum alarm distance to: ${distance} cm`);

    this.deviceConfigurationService.saveSettings(
      {
        distance
      }
    ).finally();

  }

  ngOnInit(): void {

  this.deviceConfigurationService
      .loadSettings()
      .finally();

    console.log('DeviceControlComponent INIT');

  }

}
