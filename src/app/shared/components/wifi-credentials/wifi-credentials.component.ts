import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';

import { DeviceService } from '@services/device/device.service';
import { DeviceAppState, USBCommandType, WiFiCredentials, WiFiNetwork } from '@shared-with-electron/.';
import { COMMON_MATERIAL_IMPORTS, FORM_MATERIAL_IMPORTS } from '@shared/utils/material-imports';
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
  
  // Convert properties to signals
  public isSendingCredentials = signal<boolean>(false);
  public isRefreshingWiFiNetworks = signal<boolean>(false);
  public wiFiNetworks = signal<WiFiNetwork[]>([]);

  credentialsForm = new FormGroup({
    ssid: new FormControl({ value: '', disabled: true }, [Validators.required]),
    password: new FormControl({ value: '', disabled: true }, [Validators.required])
  });

  // Convert observables to signals
  private wiFiNetworksSignal = toSignal(this.deviceService.wiFiNetworks$, { initialValue: [] });
  private errorSignal = toSignal(this.deviceService.error$);
  private appStatusSignal = toSignal(this.deviceService.deviceAppStatus$);

  // Convert getter to computed signal
  isBusy = computed(() => {
    const sending = this.isSendingCredentials();
    const refreshing = this.isRefreshingWiFiNetworks();
    const appStatus = this.appStatusSignal();
    const scanningNetworks = this.wiFiNetworks().length === 0 && !refreshing; // Only consider scanning if not manually refreshing
    
    console.log('isBusy computed - sending:', sending, 'refreshing:', refreshing, 'appStatus:', appStatus, 'expected:', DeviceAppState.CONFIGURE_WIFI, 'scanningNetworks:', scanningNetworks);
    
    return sending ||
           refreshing ||
           scanningNetworks ||
           appStatus !== DeviceAppState.CONFIGURE_WIFI;
  });

  // Add a separate computed for spinner visibility to debug
  showSubmitSpinner = computed(() => {
    const result = this.isSendingCredentials();
    console.log('showSubmitSpinner computed:', result);
    return result;
  });

  constructor(
    private deviceService: DeviceService,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private errorService: ErrorService
  ) {
    
    // Replace WiFi networks subscription with effect
    effect(() => {
      const networks = this.wiFiNetworksSignal();
      this.wiFiNetworks.set(networks || []);
    });

    // Handle form control state based on network availability and busy state
    effect(() => {
      const networks = this.wiFiNetworks();
      const busy = this.isBusy();
      
      console.log('Form control effect - networks:', networks.length, 'busy:', busy);
      
      // Enable form controls only when we have networks AND not busy
      if (networks.length > 0 && !busy) {
        this.credentialsForm.get('ssid')?.enable();
        this.credentialsForm.get('password')?.enable();
      } else {
        this.credentialsForm.get('ssid')?.disable();
        this.credentialsForm.get('password')?.disable();
      }
    });

    // Replace error subscription with effect
    // This handles device errors that come through the error$ stream after sendUSBCommand completes
    effect(() => {
      const message = this.errorSignal();
      if (message) {
        console.log('Error received:', message);
        console.log('Resetting isSendingCredentials from', this.isSendingCredentials(), 'to false');
        // Reset loading state when any device error is received
        this.isSendingCredentials.set(false);
        console.log('isSendingCredentials after reset:', this.isSendingCredentials());
      }
    });


    
  }

  ngOnInit(): void {
    console.log('[WiFiCredentialsComponent]: ngOnInit');
  }

  async onSubmit() {

    console.log('Before submit - isSendingCredentials:', this.isSendingCredentials());
    this.isSendingCredentials.set(true);
    console.log('After setting - isSendingCredentials:', this.isSendingCredentials());

    console.log('[WiFiCredentialsComponent]: form submitted:', this.credentialsForm.value);

    try {
      await this.deviceService.sendUSBCommand(
        USBCommandType.SET_WIFI_CREDENTIALS,
        this.credentialsForm.value as WiFiCredentials
      );
      console.log('[WiFiCredentialsComponent]: data sent successfully');
      // Note: Don't reset isSendingCredentials here - wait for device response via error$ stream
    } catch (exception: any) {
      // This catch handles timeouts and immediate failures
      const translationTag = (exception.data) ?
        this.errorService.toTranslationTag(exception.data.error) :
          'ERRORS.APPLICATION.WIFI_CREDENTIALS_COMMAND_TIMED_OUT';
      this.snackBar.open(
        this.translate.instant(translationTag), 
        this.translate.instant('COMMON.ACTIONS.DISMISS')
      );
      // Reset loading state for immediate failures (like timeouts)
      console.log('Exception caught - resetting isSendingCredentials');
      this.isSendingCredentials.set(false);
    }

  }

  async refreshWiFiNetworks() {

    this.isRefreshingWiFiNetworks.set(true);
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
      this.isRefreshingWiFiNetworks.set(false);
    }

  }
  
  hasError(field: string, error: string): boolean {

    return !!this.credentialsForm.get(field)?.hasError(error) &&
           !!this.credentialsForm.get(field)?.touched

  }

}