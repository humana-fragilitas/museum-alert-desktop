import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { WiFiCredentialsComponent } from '../wifi-credentials/wifi-credentials.component';
import { ProvisioningService } from '../../../core/services/provisioning/provisioning.service';
import { DeviceService } from '../../../core/services/device/device.service';
import { Subscription } from 'rxjs';
import { DeviceAppState } from '../../../../../app/shared/models';
import { MatStepper } from '@angular/material/stepper';
import { AuthService } from '../../../core/services/auth/auth.service';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatCard, MatCardContent, MatCardFooter, MatCardHeader, MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-device-state',
  templateUrl: './device-state.component.html',
  styleUrls: ['./device-state.component.scss'],
  imports: [ 
    AsyncPipe,
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ]
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
