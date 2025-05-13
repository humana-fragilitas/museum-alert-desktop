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
  selector: 'app-device-diagnostics',
  templateUrl: './device-diagnostics.component.html',
  styleUrls: ['./device-diagnostics.component.scss'],
  imports: [ ]
})
export class DeviceDiagnosticsComponent implements OnInit, OnDestroy {

  constructor(
    public readonly deviceService: DeviceService
  ) {};

  ngOnInit(): void {

    console.log('DeviceDiagnosticsComponent INIT');

  }

  ngOnDestroy(): void {

  }

}
