import { TranslatePipe,
         TranslateService } from '@ngx-translate/core';

import { Component,
         OnInit,
         signal,
         computed,
         effect } from '@angular/core';
import { FormGroup,
         FormControl,
         Validators,
         ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DeviceService } from '@services/device/device.service';
import { DeviceAppState,
         USBCommandType,
         WiFiCredentials,
         WiFiNetwork } from '@shared-with-electron';
import { COMMON_MATERIAL_IMPORTS,
         FORM_MATERIAL_IMPORTS } from '@shared/utils/material-imports';
import { ErrorService } from '@services/error/error.service';


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
export class WiFiCredentialsComponent implements OnInit {

  private wiFiNetworksSignal = this.deviceService.wiFiNetworks;
  private errorSignal = this.deviceService.error;
  private appStatusSignal = this.deviceService.deviceAppStatus;
  private previousError: any = null;
  
  readonly isSendingCredentials = signal<boolean>(false);
  readonly isRefreshingWiFiNetworks = signal<boolean>(false);
  readonly wiFiNetworks = signal<WiFiNetwork[]>([]);
  readonly isBusy = computed(() => {
    const sending = this.isSendingCredentials();
    const refreshing = this.isRefreshingWiFiNetworks();
    const appStatus = this.appStatusSignal();
    const scanningNetworks = this.wiFiNetworks().length === 0 && !refreshing;
    return sending ||
           refreshing ||
           scanningNetworks ||
           appStatus !== DeviceAppState.CONFIGURE_WIFI;
  });
  readonly showSubmitSpinner = computed(() => {
    const result = this.isSendingCredentials();
    return result;
  });

  readonly credentialsForm = new FormGroup({
    ssid: new FormControl({ value: '', disabled: true }, [Validators.required]),
    password: new FormControl({ value: '', disabled: true }, [Validators.required])
  });

  constructor(private deviceService: DeviceService,
              private snackBar: MatSnackBar,
              private translate: TranslateService,
              private errorService: ErrorService) {
    
    effect(() => {
      const networks = this.wiFiNetworksSignal();
      this.wiFiNetworks.set(networks || []);
    });

    effect(() => {
      const networks = this.wiFiNetworks();
      const busy = this.isBusy();
      if (networks.length > 0 && !busy) {
        this.credentialsForm.get('ssid')?.enable();
        this.credentialsForm.get('password')?.enable();
      } else {
        this.credentialsForm.get('ssid')?.disable();
        this.credentialsForm.get('password')?.disable();
      }
    });

    effect(() => {
      const message = this.errorSignal();
      if (message && message !== this.previousError && this.isSendingCredentials()) {
        this.isSendingCredentials.set(false);
      }
      this.previousError = message;
    });

  }

  ngOnInit(): void {
    console.log('[WiFiCredentialsComponent]: ngOnInit');
  }

  async onSubmit() {

    this.isSendingCredentials.set(true);
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
      this.isSendingCredentials.set(false);
    }

  }

  async refreshWiFiNetworks() {

    this.isRefreshingWiFiNetworks.set(true);
    this.credentialsForm.reset();

    try {
      await this.deviceService.sendUSBCommand(USBCommandType.REFRESH_WIFI_CREDENTIALS);
      console.log('[WiFiCredentialsComponent]: WiFi networks refresh request successfully sent');
    } catch (exception) {
      this.snackBar.open(
        this.translate.instant('ERRORS.APPLICATION.WIFI_NETWORKS_REFRESH_COMMAND_TIMED_OUT'), 
        this.translate.instant('COMMON.ACTIONS.DISMISS')
      );
    } finally {
      this.isRefreshingWiFiNetworks.set(false);
    }

  }
  
  hasError(field: string, error: string): boolean {
    return !!this.credentialsForm.get(field)?.hasError(error) &&
           !!this.credentialsForm.get(field)?.touched
  }

}