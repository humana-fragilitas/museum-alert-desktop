import { Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceService } from '../../../core/services/device/device.service';
import { DeviceAppState } from '../../../../../shared/models';
import { MqttCommandType, MqttService } from '../../../core/services/mqtt/mqtt.service';
import { FormatDistancePipe } from '../../pipes/format-distance.pipe';
import { DeviceRegistryService } from '../../../core/services/device-registry/device-registry.service';
import { MatCardModule } from '@angular/material/card';
import { AsyncPipe, CommonModule } from '@angular/common';
import { ConnectionStatusComponent } from '../connection-status/connection-status.component';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { CompanyFormComponent } from '../company-form/company-form.component';
import { DeviceConfigurationService } from '../../../core/services/device-configuration/device-configuration.service';

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
    CompanyFormComponent,
    MatSliderModule,
    FormatDistancePipe,
    CommonModule,
    MatProgressSpinnerModule
  ]
})
export class DeviceControlComponent implements OnInit, OnDestroy {

  public readonly deviceAppState = DeviceAppState;
  public readonly isBusy$ = this.deviceConfigurationService.isBusy$;
  public readonly minValue = 5;
  public readonly maxValue = 500;
  public disabled = true;
  public sliderValue = this.minValue

  constructor(
    public readonly deviceService: DeviceService,
    public readonly mqttService: MqttService,
    private formatDistancePipe: FormatDistancePipe,
    private deviceConfigurationService: DeviceConfigurationService
  ) {};

  toReadableDistance(value: number): string {

    return this.formatDistancePipe.transform(value);

  }

  onSliderChange(event: Event) {

    const distance = Number((event.target as HTMLInputElement).value);

    this.sliderValue = Number(distance);

    console.log(`Setting minimum alarm distance to: ${distance} cm`);

    this.disabled = true;

    // TO DO: remove statically assigned broadcastUrl
    // after successful testing
    this.deviceConfigurationService.saveSettings(
      {
        distance,
        beaconUrl: 'https://google.com'
      }
    ).finally();

    // this.mqttService
    //     .sendCommand(
    //       MqttCommandType.SET_CONFIGURATION,
    //       { distance,
    //         beaconUrl: 'https://google.com'
    //       }
    //     )
    //     .then((configuration) => {
    //       console.log('Configuration updated:', configuration); })
    //     .catch(() => {
    //       console.error('Error updating configuration'); })
    //     .finally(() => {
    //       this.disabled = false;
    //     });

  }

  ngOnInit(): void {

    console.log('DeviceControlComponent INIT');

    // this.disabled = true;

    this.deviceConfigurationService
        .loadSettings()
        .finally();

    this.deviceConfigurationService.settings$.subscribe((configuration) => {
      if (configuration) {
        this.sliderValue = Number(configuration.distance);
      }
    });

  }

  ngOnDestroy(): void {

  }

}
