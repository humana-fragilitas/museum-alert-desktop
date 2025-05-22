import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { WiFiCredentialsComponent } from '../wifi-credentials/wifi-credentials.component';
import { ProvisioningService } from '../../../core/services/provisioning/provisioning.service';
import { DeviceService } from '../../../core/services/device/device.service';
import { Subscription } from 'rxjs';
import { DeviceAppState } from '@shared/models';
import { MatStepper } from '@angular/material/stepper';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-provisioning',
  templateUrl: './provisioning.component.html',
  styleUrls: ['./provisioning.component.scss'],
  imports: [ ]
})
export class ProvisioningComponent implements OnInit, OnDestroy {

  public isBusy: boolean = false;

  constructor(
    private readonly authService: AuthService,
    private provisioningService: ProvisioningService,
    public readonly deviceService: DeviceService
  ) {};

  ngOnInit(): void {

    console.log('ProvisioningComponent INIT');

  }

  ngOnDestroy(): void {

  }

  async createProvisioningClaim() {

    this.isBusy = true;
    
    this.provisioningService.createClaim().subscribe((claim: any) => {
      const testBluetoothPayload = {
        tempCertPem: claim.certificatePem,
        tempPrivateKey: claim.keyPair.PrivateKey
      };

      console.log("<|" + JSON.stringify(testBluetoothPayload) + "|>");
      console.log(claim);

      const idToken = this.authService.sessionData.value?.tokens?.idToken?.toString();

      this.deviceService.asyncSendData({ ...testBluetoothPayload, idToken }).finally(() => {
        this.isBusy = false; // TO DO: check if this is the right place to set isBusy to false
      });

    
    });

  }

}
