import { Component, OnDestroy, OnInit } from '@angular/core';
import { ProvisioningService } from '../../../core/services/provisioning/provisioning.service';
import { DeviceService } from '../../../core/services/device/device.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { DeviceRegistryService } from '../../../core/services/device-registry/device-registry.service';
import { DialogService } from '../../../core/services/dialog/dialog.service';
import { CommonModule } from '@angular/common';
import { CompanyService } from '../../../core/services/company/company.service';
import { ProvisioningSettings, USBCommandType } from '../../../../../app/shared';
import { COMMON_MATERIAL_IMPORTS } from '../../utils/material-imports';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogType } from '../../../core/models/ui.models';
import { Observable, tap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorService } from '../../../core/services/error/error.service';
import { Sensor } from '../../../core/models';

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
export class ProvisioningComponent implements OnInit, OnDestroy {

  isBusy: boolean = false;
  company$ = this.companyService.company$;

  constructor(
    private readonly authService: AuthService,
    private readonly provisioningService: ProvisioningService,
    public readonly deviceService: DeviceService,
    private readonly dialogService: DialogService,
    private readonly deviceRegistryService: DeviceRegistryService,
    private readonly companyService: CompanyService,
    private readonly errorService: ErrorService
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
        next: (sensor: Nullable<Sensor>) => {
          if (sensor) {
            // TO DO: fix the model reference: from any to ApiResponse<T>
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
            this.isBusy = false;
          } else {
            return this.createProvisioningClaim().subscribe();
          }
        },
        error: (error: HttpErrorResponse) => {
          this.isBusy = false;
          this.errorService.showModal(error, {
            type: DialogType.ERROR,
            title: 'ERRORS.APPLICATION.PROVISIONING_FAILED_TITLE',
            message: 'ERRORS.APPLICATION.PROVISIONING_FAILED_MESSAGE'
          }, { disableClose: true });
        }
      });

  }

  createProvisioningClaim(): Observable<any> {

    this.isBusy = true;
    
    return this.provisioningService.createClaim().pipe(
      tap((claim: any) => {

        const payload: ProvisioningSettings = {
          tempCertPem: claim.data.certificatePem,
          tempPrivateKey: claim.data.keyPair.PrivateKey,
          idToken: this.authService.idToken
        };

        console.log("<|" + JSON.stringify(payload) + "|>");
        console.log(claim);

        this.deviceService
            .sendUSBCommand(USBCommandType.SET_PROVISIONING_CERTIFICATES, payload)
            .finally(() => {
              this.isBusy = false;
            });

      })
    );

  }

}
