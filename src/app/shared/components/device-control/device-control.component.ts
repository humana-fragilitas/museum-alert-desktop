import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { WiFiCredentialsComponent } from '../wifi-credentials/wifi-credentials.component';
import { ProvisioningService } from '../../../core/services/provisioning/provisioning.service';
import { DeviceService } from '../../../core/services/device/device.service';
import { Subscription } from 'rxjs';
import { DeviceAppState } from '@shared/models';
import { MatStepper } from '@angular/material/stepper';
import { AuthService } from '../../../core/services/auth/auth.service';
import { MqttCommandType, MqttService } from '../../../core/services/mqtt/mqtt.service';

@Component({
  selector: 'app-device-control',
  templateUrl: './device-control.component.html',
  styleUrls: ['./device-control.component.scss'],
  imports: [ ]
})
export class DeviceControlComponent implements OnInit, OnDestroy {

  public readonly deviceAppState = DeviceAppState;

  constructor(
    public readonly deviceService: DeviceService,
    public readonly mqttService: MqttService
  ) {};

  formatSliderLabel(value: number): string {

    if (value < 100) {
      return `${value} cm`;
    } else if (value > 100 && value < 200){
      return `${(value / 100).toFixed(2)} meter`;
    } else {
      return `${(value / 100).toFixed(2)} meters`;
    }

  }

  onSliderChange(event: Event) {

    const distance = (event.target as HTMLInputElement).value;

    console.log(`Setting minimum alarm distance to: ${distance} cm`);

    this.mqttService.sendCommand(MqttCommandType.SET_CONFIGURATION,
      { distance });

  }

  ngOnInit(): void {

    console.log('DeviceControlComponent INIT');

  }

  ngOnDestroy(): void {

  }

}
