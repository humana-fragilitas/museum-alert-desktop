import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { DeviceService } from '../../../../app/core/services/device/device.service';
import { DeviceAppState, DeviceErrorType, DeviceIncomingData, USBCommandType, WiFiCredentials, WiFiNetwork } from '../../../../../app/shared';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { COMMON_MATERIAL_IMPORTS, FORM_MATERIAL_IMPORTS } from '../../utils/material-imports';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorService } from '../../../core/services/error/error.service';

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

  constructor(
    private deviceService: DeviceService,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private errorService: ErrorService
  ) {}

  ngOnInit(): void {

    console.log('[WiFiCredentialsComponent]: ngOnInit');

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

    //TO DO: this is not probably needed anymore: errors return a cid so that
    //asyncSendData call observable is able to return such exception by itself
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

    console.log('[WiFiCredentialsComponent]: form submitted:', this.credentialsForm.value);

    try {
      await this.deviceService.sendUSBCommand(
        USBCommandType.SET_WIFI_CREDENTIALS,
        this.credentialsForm.value as WiFiCredentials
      );
      console.log('[WiFiCredentialsComponent]: data sent successfully');
    } catch (exception: any) {
      const translationTag = (exception.data) ?
        this.errorService.toTranslationTag(exception.data.error) :
          'ERRORS.APPLICATION.WIFI_CREDENTIALS_COMMAND_TIMED_OUT';
      this.snackBar.open(
        this.translate.instant(translationTag), 
        this.translate.instant('COMMON.ACTIONS.DISMISS')
      );
      this.isSendingCredentials = false;
    }

  }

  async refreshWiFiNetworks() {

    this.isRefreshingWiFiNetworks = true;
    this.credentialsForm.reset();
    console.log('[WiFiCredentialsComponent]: sending empty payload to refresh WiFi networks...');

    try {
      await this.deviceService.sendUSBCommand(USBCommandType.REFRESH_WIFI_CREDENTIALS);
      console.log('[WiFiCredentialsComponent]: WiFi networks refresh request successfully sent');
    } catch (exception) {
      this.snackBar.open(
        this.translate.instant('ERRORS.APPLICATION.WIFI_NETWORKS_REFRESH_COMMAND_TIMED_OUT'), 
        this.translate.instant('COMMON.ACTIONS.DISMISS')
      );
    } finally {
      this.isRefreshingWiFiNetworks = false;
    }

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
