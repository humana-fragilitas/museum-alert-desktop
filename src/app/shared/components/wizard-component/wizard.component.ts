import { firstValueFrom, Subject } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { Component,
         OnDestroy,
         OnInit,
         ViewChild,
         ViewEncapsulation,
         AfterViewInit,
         computed,
         effect,
         signal } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';
import { CommonModule } from '@angular/common';

import { WiFiCredentialsComponent } from '@shared/components/wifi-credentials/wifi-credentials.component';
import { DeviceService } from '@services/device/device.service';
import { DeviceAppState,
         USBCommandType } from '@shared-with-electron';
import { ProvisioningComponent } from '@shared/components/provisioning/provisioning.component';
import { DeviceControlComponent } from '@shared/components/device-control/device-control.component';
import { DeviceDiagnosticsComponent } from '@shared/components/device-diagnostics/device-diagnostics.component';
import { COMMON_MATERIAL_IMPORTS } from '@shared/utils/material-imports';
import { DeviceRegistryService } from '@services/device-registry/device-registry.service';
import { DialogService } from '@services/dialog/dialog.service';
import { DialogType } from '@models';

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss'],
  imports: [
    WiFiCredentialsComponent,
    CommonModule,
    ProvisioningComponent,
    DeviceControlComponent,
    DeviceDiagnosticsComponent,
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS
  ],
  encapsulation: ViewEncapsulation.None
})
export class WizardComponent implements OnInit, AfterViewInit, OnDestroy {

  private destroy$ = new Subject<void>();
  private usbConnectionStatus = signal<boolean>(false);
  private deviceAppStatus = signal<Nullable<DeviceAppState>>(null);
  
  readonly isVisible = this.usbConnectionStatus.asReadonly();
  readonly isReady = computed(() => {
    const appStatus = this.deviceAppStatus();
    return appStatus != DeviceAppState.STARTED && appStatus != DeviceAppState.FATAL_ERROR;
  });
  readonly hasFatalError = computed(() => this.deviceAppStatus() == DeviceAppState.FATAL_ERROR);
  readonly isRequestingReset = signal<boolean>(false);
  
  @ViewChild('stepper') stepper!: MatStepper;
  
  private latestAppStatus: Nullable<DeviceAppState> = null;
  
  constructor(
    private readonly deviceService: DeviceService,
    private readonly deviceRegistryService: DeviceRegistryService,
    private readonly dialogService: DialogService
  ) {

    effect(() => {
      const appStatus = this.deviceAppStatus();
      this.latestAppStatus = appStatus;
      if (this.stepper) {
        this.setStepperState(appStatus);
      }
    });

    effect(() => {
      const isConnected = this.deviceService.usbConnectionStatus();
      const appStatus = this.deviceService.deviceAppStatus();
      this.usbConnectionStatus.set(isConnected);
      this.deviceAppStatus.set(appStatus);
    });
  }

  ngOnInit(): void {

    console.log('WizardComponent INIT');
  
  }

  ngAfterViewInit(): void {
    
    if (this.latestAppStatus) {
      this.setStepperState(this.latestAppStatus);
    }
  
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setStepperState(state: Nullable<DeviceAppState>) {
    switch (state) {
      case DeviceAppState.CONFIGURE_WIFI:
        this.onStep(0);
        break;
      case DeviceAppState.CONFIGURE_CERTIFICATES:
        this.onStep(1);
        break;
      case DeviceAppState.PROVISION_DEVICE:
        this.onStep(2);
        break;
      case DeviceAppState.DEVICE_INITIALIZED:
        this.onStep(3);
        break;
    }
  }

  onStep(index: number) {
    const stepsArray = Array.from(this.stepper.steps);
    const stepsArrayLength = stepsArray.length;
    stepsArray.forEach((step, i, arr) => {
      const isDone = (i < index) || (index == (stepsArrayLength - 1));
      step.completed = isDone;
      step.editable = false;
      step.state = isDone ? 'done' : 'number';
      this.stepper.selectedIndex = i;
    });
  }

  async reset() {

    const serialNumber = this.deviceService.serialNumber();

    this.dialogService.openDialog({
      type: DialogType.WARNING,
      title: 'WARNINGS.ABOUT_TO_UNREGISTER_AND_RESET_SENSOR_TITLE',
      message: 'WARNINGS.ABOUT_TO_UNREGISTER_AND_RESET_SENSOR_MESSAGE',
      messageParams: {
        deviceName: serialNumber
      },
      confirmText: 'COMMON.ACTIONS.RESET_SENSOR',
      cancelText: 'COMMON.ACTIONS.CANCEL',
      showCancel: true
    }).subscribe(async (result) => {
      if (result?.confirmed) {
        this.isRequestingReset.set(true);
        try {
          await firstValueFrom(this.deviceRegistryService.deleteSensor(serialNumber));
          await this.deviceService.sendUSBCommand(USBCommandType.RESET, null);
        } catch (error) {
          console.error('An error occurred while trying to delete and reset sensor:', error);
        } finally {
          this.isRequestingReset.set(false);
        }
      }
    });

  }
  
}