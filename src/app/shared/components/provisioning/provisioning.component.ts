import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom, map } from 'rxjs';

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';

import { ProvisioningService } from '@services/provisioning/provisioning.service';
import { DeviceService, USBCommandTimeoutException } from '@services/device/device.service';
import { AuthService } from '@services/auth/auth.service';
import { DeviceRegistryService } from '@services/device-registry/device-registry.service';
import { DialogService } from '@services/dialog/dialog.service';
import { CompanyService } from '@services/company/company.service';
import { DeviceIncomingData, ProvisioningSettings, USBCommandType } from '@shared-with-electron/.';
import { COMMON_MATERIAL_IMPORTS } from '@shared/utils/material-imports';
import { DialogType } from '@models/ui.models';
import { ErrorService } from '@services/error/error.service';
import { ApiResult, ProvisioningClaimResponse, Sensor } from '@models/.';
import { SuccessApiResponse } from '@models/.';


@Component({
  selector: 'app-provisioning',
  templateUrl: './provisioning.component.html',
  styleUrls: ['./provisioning.component.scss'],
  imports: [
    CommonModule,
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS
  ]
})
export class ProvisioningComponent implements OnInit {

  // Convert property to signal
  isBusy = signal<boolean>(false);
  
  // Convert observable to signal
  company = this.companyService.organization;

  constructor(
    private readonly authService: AuthService,
    private readonly provisioningService: ProvisioningService,
    public readonly deviceService: DeviceService,
    private readonly dialogService: DialogService,
    private readonly deviceRegistryService: DeviceRegistryService,
    private readonly companyService: CompanyService,
    private readonly errorService: ErrorService
  ) {}

  ngOnInit(): void {
    console.log('ProvisioningComponent INIT');
  }

  async provisionDevice() {

    console.log('[ProvisioningComponent]: Provisioning device...');

    try {

      this.isBusy.set(true);
      let sensor: Nullable<Sensor>;

      console.log(`[ProvisioningComponent]: step 1/3: checking if sensor has already been registered...`);
      
      // Note: assignment and evaluation
      if (!(sensor = await this.checkIfSensorExists())) {

        console.log(`[ProvisioningComponent]: step 2/3: creating provisioning claim...`);
        const claim = await this.createClaim();

        console.log(`[ProvisioningComponent]: step 3/3: sending provisioning settings to device...`);
        await this.sendProvisioningSettingsToDevice(claim!);

      } else {

        this.dialogService.openDialog({
          type: DialogType.WARNING,
          showCancel: false,
          title: 'ERRORS.APPLICATION.DEVICE_EXISTS_TITLE',
          message: sensor.company ?
            'ERRORS.APPLICATION.DEVICE_EXISTS_IN_OWN_COMPANY_MESSAGE' :
              'ERRORS.APPLICATION.DEVICE_EXISTS_IN_OTHER_COMPANY_MESSAGE',
          messageParams: {
            deviceName: sensor.thingName
          }
        });

      }
    } catch(exception) {

      console.log(`[ProvisioningComponent]: an error occurred while provisioning device`);
      this.errorService.showModal({
        exception: exception as HttpErrorResponse | USBCommandTimeoutException,
        data: {
          type: DialogType.ERROR,
          title: 'ERRORS.APPLICATION.PROVISIONING_FAILED_TITLE',
          message: 'ERRORS.APPLICATION.PROVISIONING_FAILED_MESSAGE'
        },
        dialogConfig: { disableClose: true }
      });

    } finally {

      this.isBusy.set(false);

    }

  }

  private async checkIfSensorExists(): Promise<Nullable<Sensor>> {

    const thingName = this.deviceService.getSerialNumber();
    return firstValueFrom(this.deviceRegistryService.checkSensorExists(thingName));

  }

  private async createClaim(): Promise<Nullable<ProvisioningSettings>> {

    return firstValueFrom(this.provisioningService.createClaim().pipe(
      map((response: ApiResult<ProvisioningClaimResponse>) => {
        const claim = (response as SuccessApiResponse<ProvisioningClaimResponse>).data;

        console.log({
          tempCertPem: claim.certificatePem,
          tempPrivateKey: claim.keyPair.PrivateKey,
          idToken: this.authService.idToken()
        });

        return {
          tempCertPem: claim.certificatePem,
          tempPrivateKey: claim.keyPair.PrivateKey,
          idToken: this.authService.idToken()
        };
      })
    ));

  }

  private async sendProvisioningSettingsToDevice(claim: ProvisioningSettings): Promise<DeviceIncomingData | void> {
 
      return this.deviceService
                 .sendUSBCommand(USBCommandType.SET_PROVISIONING_CERTIFICATES, claim);

  }

}