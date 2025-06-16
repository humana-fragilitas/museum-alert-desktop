import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { WiFiCredentialsComponent } from '../wifi-credentials/wifi-credentials.component';
import { ProvisioningService } from '../../../core/services/provisioning/provisioning.service';
import { DeviceService } from '../../../core/services/device/device.service';
import { Subscription } from 'rxjs';
import { DeviceAppState } from '@shared/models';
import { MatStepper } from '@angular/material/stepper';
import { AuthService } from '../../../core/services/auth/auth.service';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatCard, MatCardContent, MatCardFooter, MatCardHeader } from '@angular/material/card';

@Component({
  selector: 'app-device-state',
  templateUrl: './device-state.component.html',
  styleUrls: ['./device-state.component.scss'],
  imports: [AsyncPipe, CommonModule, MatCard, MatCardContent, MatCardFooter, MatCardHeader]
})
export class DeviceStateComponent implements OnInit, OnDestroy {

  public readonly deviceAppState = DeviceAppState;

  constructor(public readonly deviceService: DeviceService) {};

  ngOnInit(): void {

    console.log('DeviceStateComponent INIT');

  }

  ngOnDestroy(): void {

  }

}
