import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { WiFiCredentialsComponent } from '../wifi-credentials/wifi-credentials.component';
import { ProvisioningService } from '../../../core/services/provisioning/provisioning.service';
import { DeviceService } from '../../../core/services/device/device.service';
import { combineLatest, Subscription, takeUntil } from 'rxjs';
import { DeviceAppState } from '@shared/models';
import { MatStepper } from '@angular/material/stepper';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss'],
  imports: [ WiFiCredentialsComponent ],
  encapsulation: ViewEncapsulation.None
})
export class WizardComponent implements OnInit, OnDestroy {

  private deviceCombinedStateSubscription: Subscription;

  isVisible: boolean = false;
  isReady: boolean = false;
  @ViewChild('stepper') stepper!: MatStepper;

  constructor(
    public deviceService: DeviceService,
    private provisioningService: ProvisioningService,
    private authService: AuthService
  ) {

    this.deviceCombinedStateSubscription = combineLatest(
      [this.deviceService.connectionStatus$, this.deviceService.deviceAppStatus$]
    ).subscribe(([isConnected, appStatus]) => {

      this.setStepperState(appStatus);
      this.isVisible = isConnected;
      this.isReady = isConnected && appStatus != DeviceAppState.STARTED;

    });

  }

  ngOnInit(): void {
    console.log('WizardComponent INIT');

  }

  ngOnDestroy(): void {

    this.deviceCombinedStateSubscription.unsubscribe();

  }

  createProvisioningClaim() {

    this.provisioningService.createClaim().subscribe((claim:any)=> {

      const testBluetoothPayload = {
        tempCertPem: claim.certificatePem,
        tempPrivateKey: claim.keyPair.PrivateKey
      };
      console.log("<|" + JSON.stringify(testBluetoothPayload) + "|>");
      console.log(claim);

      const idToken = this.authService
                          .sessionData
                          .value
                          ?.tokens
                          ?.idToken
                          ?.toString();

      this.deviceService.sendData({ ...testBluetoothPayload, idToken });
      
    });

  }

  setStepperState(state: Nullable<DeviceAppState>) {

    switch (state) {

      case DeviceAppState.CONFIGURE_WIFI:
        this.stepper.steps.get(0)!.editable = true;
        this.stepper.selectedIndex = 0;
        break;
      case DeviceAppState.CONFIGURE_CERTIFICATES:
        this.stepper.steps.get(0)!.completed = true;
        this.stepper.selectedIndex = 1;
        break;
      case DeviceAppState.PROVISION_DEVICE:
        this.stepper.steps.get(1)!.completed = true;
        this.stepper.selected!.completed = true;
        this.stepper.selectedIndex = 2;
        break;
      case DeviceAppState.DEVICE_INITIALIZED:
        this.stepper.steps.get(2)!.completed = true;
        this.stepper.selected!.completed = true;
        this.stepper.selectedIndex = 3;
        break;

    }

  } 



}
