import { Component, OnInit, OnDestroy } from '@angular/core';
import { DeviceService } from '../core/services/device/device.service';
import { Observable, Subscription } from 'rxjs';
import { DeviceAppState } from '../../../app/shared/models';
import { DeviceStateComponent } from '../shared/components/device-state/device-state.component';
import { WizardComponent } from '../shared/components/wizard-component/wizard.component';
@Component({
  selector: 'app-device',
  templateUrl: './device.component.html',
  styleUrls: ['./device.component.scss'],
  imports: [DeviceStateComponent, WizardComponent],
})
export class DeviceComponent implements OnInit {

  public deviceAppState = DeviceAppState;

  constructor(public deviceService: DeviceService) { }

  ngOnInit(): void {
    console.log('Device INIT');
  }

}
