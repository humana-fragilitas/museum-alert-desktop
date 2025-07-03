import { Component, OnDestroy, OnInit } from '@angular/core';
import { ProvisioningService } from '../../../core/services/provisioning/provisioning.service';
import { DeviceService } from '../../../core/services/device/device.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DeviceRegistryService, Sensor } from '../../../core/services/device-registry/device-registry.service';
import { DialogService } from '../../../core/services/dialog/dialog.service';
import { AuthenticationExpiredError } from '../../../core/interceptors/auth-token.interceptor';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { CompanyService } from '../../../core/services/company/company.service';
import { USBCommandType } from '../../../../../app/shared/models';

@Component({
  selector: 'app-provisioning',
  templateUrl: './provisioning.component.html',
  styleUrls: ['./provisioning.component.scss'],
  imports: [
    AsyncPipe,
    CommonModule,
    MatProgressSpinnerModule,
    MatButtonModule
  ]
})
export class ProvisioningComponent implements OnInit, OnDestroy {

  isBusy: boolean = false;
  company$ = this.companyService.company$;

  constructor(
    private readonly authService: AuthService,
    private provisioningService: ProvisioningService,
    public readonly deviceService: DeviceService,
    private readonly dialogService: DialogService,
    private readonly deviceRegistryService: DeviceRegistryService,
    private readonly companyService: CompanyService
  ) {};

  ngOnInit(): void {

    console.log('ProvisioningComponent INIT');

  }

  ngOnDestroy(): void {

  }

  async provisionDevice() {

    console.log('[ProvisioningComponent]: Provisioning device...');

    this.isBusy = true;
    
    const thingName = this.deviceService.getSerialNumber();
    this.deviceRegistryService.checkSensorExists(thingName)
      .subscribe({

        next: (sensor: any) => {

          if (sensor) {
            
            // TO DO: fix the model reference: from any to ApiResponse<T>
            // TO DO: the lambda suitable for checking device existence should return the company
            // name by looking up the database
            this.dialogService.showDeviceExists(sensor.data.thingName, sensor.data.company).subscribe();
            this.isBusy = false;

          } else {

            this.createProvisioningClaim();

          }

        },

        error: (error: any) => {
          
          this.isBusy = false;
          if (error instanceof AuthenticationExpiredError) return;
          this.dialogService.showError('An Error Occurred', 'Cannot provision device. Please try again later.');

        }

      });

  }

  async createProvisioningClaim() {

    this.isBusy = true;
    
    this.provisioningService.createClaim().subscribe((claim: any) => {
      const testBluetoothPayload = {
        tempCertPem: claim.data.certificatePem,
        tempPrivateKey: claim.data.keyPair.PrivateKey
      };

      console.log("<|" + JSON.stringify(testBluetoothPayload) + "|>");
      console.log(claim);

      const idToken = this.authService.sessionData.value?.tokens?.idToken?.toString();

      this.deviceService.asyncSendData(USBCommandType.SET_PROVISIONING_CERTIFICATES, { ...testBluetoothPayload, idToken }).finally(() => {
        this.isBusy = false; // TO DO: check if this is the right place to set isBusy to false
      });

    
    });

  }

}
