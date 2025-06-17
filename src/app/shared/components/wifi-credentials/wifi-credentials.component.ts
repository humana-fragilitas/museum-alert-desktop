import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { DeviceService } from '../../../../app/core/services/device/device.service';
import { DeviceErrorType, WiFiNetwork } from '@shared/models';
import { Subscription } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProvisioningComponent } from '../provisioning/provisioning.component';
import { DeviceControlComponent } from '../device-control/device-control.component';
import { DeviceDiagnosticsComponent } from '../device-diagnostics/device-diagnostics.component';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-wifi-credentials',
  templateUrl: './wifi-credentials.component.html',
  styleUrls: ['./wifi-credentials.component.scss'],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    CommonModule,
    ProvisioningComponent,
    DeviceControlComponent,
    DeviceDiagnosticsComponent,
    MatSelectModule
  ]
})
export class WiFiCredentialsComponent implements OnInit, OnDestroy {
  
  public isBusy = false;
  public wiFiNetworks: WiFiNetwork[] = [];

  credentialsForm = new FormGroup({
    ssid: new FormControl({ value: '', disabled: true }, [Validators.required]),
    password: new FormControl({ value: '', disabled: true }, [Validators.required])
  });

  private wiFiNetworksSubscription!: Subscription;
  private errorSubscription!: Subscription;

  constructor(private deviceService: DeviceService) {}

  ngOnInit(): void {
    console.log('WiFiCredentials INIT');

    this.wiFiNetworksSubscription = this.deviceService.wiFiNetworks$.subscribe((networks) => {

      this.wiFiNetworks = networks;

      if (this.wiFiNetworks.length) {

        this.credentialsForm.get('ssid')?.enable();
        this.credentialsForm.get('password')?.enable();

      } else {

        this.credentialsForm.get('ssid')?.disable();
        this.credentialsForm.get('password')?.disable();

      }

    });

    this.errorSubscription = this.deviceService.error$.subscribe((error: DeviceErrorType) => {
    
      if (error != DeviceErrorType.INVALID_WIFI_CREDENTIALS) {
        this.isBusy = false;
      }

    });
    
  }

  ngOnDestroy(): void {
    this.wiFiNetworksSubscription.unsubscribe();
    this.errorSubscription.unsubscribe();
  }

  async onSubmit() {

    this.isBusy = true;
    console.log('Form submitted:', this.credentialsForm.value);
    this.deviceService.asyncSendData(this.credentialsForm.value)
      .then(() => {
        console.log('Data sent successfully');
      })
      .catch((error) => {
        this.isBusy = false;
      });

  }

}
