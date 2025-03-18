import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation, AfterViewInit } from '@angular/core';
import { WiFiCredentialsComponent } from '../wifi-credentials/wifi-credentials.component';
import { ProvisioningService } from '../../../core/services/provisioning/provisioning.service';
import { DeviceService } from '../../../core/services/device/device.service';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { DeviceAppState } from '@shared/models';
import { MatStepper } from '@angular/material/stepper';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss'],
  imports: [WiFiCredentialsComponent],
  encapsulation: ViewEncapsulation.None
})
export class WizardComponent implements OnInit, AfterViewInit, OnDestroy {

  private destroy$ = new Subject<void>();

  isVisible: boolean = false;
  isReady: boolean = false;

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
        this.isReady = isConnected && appStatus !== DeviceAppState.STARTED;

        // Store the latest app state for use in ngAfterViewInit
        this.latestAppStatus = appStatus;
        if (this.stepper) {
          this.setStepperState(appStatus);
        }
      });
  }

  ngAfterViewInit(): void {
    // Once the view is ready, update the stepper with the latest app status
    if (this.latestAppStatus) {
      this.setStepperState(this.latestAppStatus);
    }

    // TO DO: remove; debug only
    //this.setStepperState(DeviceAppState.PROVISION_DEVICE);

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

    this.stepper.selectedIndex = index;

    Array.from(this.stepper.steps).forEach((step, i, arr) => {
      step.completed = i <= index;
      step.editable = false;
      step.state = 'done';
    });

  }

}
