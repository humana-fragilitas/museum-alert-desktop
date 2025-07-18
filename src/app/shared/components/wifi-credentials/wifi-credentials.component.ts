import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { DeviceService } from '../../../../app/core/services/device/device.service';
import { DeviceAppState, DeviceErrorType, DeviceIncomingData, USBCommandType, WiFiNetwork } from '../../../../../app/shared/models';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { COMMON_MATERIAL_IMPORTS, FORM_MATERIAL_IMPORTS } from '../../utils/material-imports';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-wifi-credentials',
  templateUrl: './wifi-credentials.component.html',
  styleUrls: ['./wifi-credentials.component.scss'],
  imports: [
    ReactiveFormsModule,
    CommonModule,
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS,
    ...FORM_MATERIAL_IMPORTS
  ]
})
export class WiFiCredentialsComponent implements OnInit, OnDestroy {
  
  public isSendingCredentials = false;
  public isRefreshingWiFiNetworks = false;
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

    // TO DO: this is not probably needed anymore: errors return a cid so that
    // asyncSendData call observable is able to return such exception by itself
    this.errorSubscription = this.deviceService.error$.subscribe(
      (message: Nullable<DeviceIncomingData>) => {
        if (message && (message!.data as { error: DeviceErrorType }).error != DeviceErrorType.INVALID_WIFI_CREDENTIALS) {
          this.isSendingCredentials = false;
        }
      }
    );
    
  }

  ngOnDestroy(): void {
    this.wiFiNetworksSubscription.unsubscribe();
    this.errorSubscription.unsubscribe();
  }

  async onSubmit() {

    this.isSendingCredentials = true;

    console.log('Form submitted:', this.credentialsForm.value);

    // TO DO: try ... catch... block here!
    this.deviceService.asyncSendData(
      USBCommandType.SET_WIFI_CREDENTIALS,
      this.credentialsForm.value
    )
    .then(() => {
      console.log('Data sent successfully');
    })
    .catch((error) => {
      this.isSendingCredentials = false;
    });

  }

  refreshWiFiNetworks() {

    this.isRefreshingWiFiNetworks = true;
    this.credentialsForm.reset();
    console.log('Sending empty payload to refresh WiFi networks...');
    this.deviceService.asyncSendData(
      USBCommandType.REFRESH_WIFI_CREDENTIALS,
      this.credentialsForm.value
    ).then(() => {
        console.log('WiFi networks request sent successfully');
        this.isRefreshingWiFiNetworks = false;
      })
      .catch((error) => {
        this.isRefreshingWiFiNetworks = false;
      });

  }

  get isBusy(): boolean {
    return this.isSendingCredentials ||
           this.isRefreshingWiFiNetworks ||
           this.deviceService.getAppStatus() !== DeviceAppState.CONFIGURE_WIFI;
  }
  
  hasError(field: string, error: string): boolean {

    return !!this.credentialsForm.get(field)?.hasError(error) &&
           !!this.credentialsForm.get(field)?.touched

  }

} 
