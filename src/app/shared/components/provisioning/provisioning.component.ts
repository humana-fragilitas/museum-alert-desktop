import { Component, OnDestroy, OnInit } from '@angular/core';
import { ProvisioningService } from '../../../core/services/provisioning/provisioning.service';
import { DeviceService } from '../../../core/services/device/device.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DeviceRegistryService, Sensor } from '../../../core/services/device-registry/device-registry.service';
import { DialogService } from '../../../core/services/dialog/dialog.service';
import { AuthenticationExpiredError } from '../../../core/interceptors/auth-token.interceptor';

@Component({
  selector: 'app-provisioning',
  templateUrl: './provisioning.component.html',
  styleUrls: ['./provisioning.component.scss']
})
export class ProvisioningComponent implements OnInit, OnDestroy {

  public isBusy: boolean = false;

  constructor(
    private readonly authService: AuthService,
    private provisioningService: ProvisioningService,
    public readonly deviceService: DeviceService,
    private readonly deviceRegistryService: DeviceRegistryService,
    private readonly dialogService: DialogService
  ) {};

  ngOnInit(): void {

    console.log('ProvisioningComponent INIT');

  }

  ngOnDestroy(): void {

  }

  async provisionDevice() {

    console.log('[ProvisioningComponent]: Provisioning device...');

    this.isBusy = true;
    
    const thingName = this.deviceService.serialNumber$.getValue();
    this.deviceRegistryService.checkSensorExists(thingName)
      .subscribe({

        next: (sensor: Nullable<Sensor>) => {

          if (sensor) {

            this.dialogService.showDeviceExists(sensor.thingName, sensor.company).subscribe();
            this.isBusy = false;

          } else {

            this.createProvisioningClaim();

          }

        },

        error: (error: any) => {
          
          this.isBusy = false;
          // TO DO: pass error to dialog service to check if it is an AuthenticationExpiredError?
          if (error instanceof AuthenticationExpiredError) return;
          this.dialogService.showError('An Error Occurred', 'Cannot provision device. Please try again later.');

        }

      });

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
