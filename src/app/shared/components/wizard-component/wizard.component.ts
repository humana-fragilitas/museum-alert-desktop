import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation, AfterViewInit } from '@angular/core';
import { WiFiCredentialsComponent } from '../wifi-credentials/wifi-credentials.component';
import { ProvisioningService } from '../../../core/services/provisioning/provisioning.service';
import { DeviceService } from '../../../core/services/device/device.service';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { DeviceAppState, USBCommandType } from '@shared/models';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { AuthService } from '../../../core/services/auth/auth.service';
import { CommonModule } from '@angular/common';
import { ProvisioningComponent } from '../provisioning/provisioning.component';
import { DeviceControlComponent } from '../device-control/device-control.component';
import { DeviceDiagnosticsComponent } from '../device-diagnostics/device-diagnostics.component';

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss'],
  imports: [
    WiFiCredentialsComponent,
    CommonModule,
    MatStepperModule,
    ProvisioningComponent,
    DeviceControlComponent,
    DeviceDiagnosticsComponent
  ],
  encapsulation: ViewEncapsulation.None
})
export class WizardComponent implements OnInit, AfterViewInit, OnDestroy {

  private destroy$ = new Subject<void>();

  isVisible: boolean = false;
  isReady: boolean = false;
  hasFatalError: boolean = false;
  isRequestingReset: boolean = false;

  @ViewChild('stepper') stepper!: MatStepper;

  private latestAppStatus: Nullable<DeviceAppState> = null;

  constructor(
    public deviceService: DeviceService,
    private provisioningService: ProvisioningService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('WizardComponent INIT');

    combineLatest([
      this.deviceService.usbConnectionStatus$,
      this.deviceService.deviceAppStatus$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([isConnected, appStatus]) => {
        this.isVisible = isConnected;
        this.isReady = (appStatus != DeviceAppState.STARTED &&
                        appStatus != DeviceAppState.FATAL_ERROR);
        this.hasFatalError = (appStatus == DeviceAppState.FATAL_ERROR);  

        this.latestAppStatus = appStatus;
        if (this.stepper) {
          this.setStepperState(appStatus);
        }
      });

    // TO DO: remove after testing
    // this.isReady = false;
    // this.isVisible = true;
    // this.hasFatalError = true;
   

  }

  ngAfterViewInit(): void {

    if (this.latestAppStatus) {
      this.setStepperState(this.latestAppStatus);
    }

     // TO DO: remove after testing
    //  this.setStepperState(DeviceAppState.FATAL_ERROR);

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

    Array.from(this.stepper.steps).forEach((step, i, arr) => {
      step.completed = i < index;
      step.editable = false;
      step.state = 'done';
      this.stepper.selectedIndex = i;
    });

  }

  async reset() {

    this.isRequestingReset = true
    this.deviceService.asyncSendData({ command: USBCommandType.HARD_RESET }).then(() => {
      this.isRequestingReset = false;
    }).catch(() => {  
      this.isRequestingReset = false;
    }).finally(() => {
      this.isRequestingReset = false;
    });

  }

}
