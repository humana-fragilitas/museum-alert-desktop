import { Component, OnInit } from '@angular/core';

import { DeviceAppState } from '@shared-with-electron/.';
import { DeviceStateComponent } from '@shared/components/device-state/device-state.component';
import { WizardComponent } from '@shared/components/wizard-component/wizard.component';
import { COMMON_MATERIAL_IMPORTS } from '@shared/utils/material-imports';


@Component({
  selector: 'app-device',
  templateUrl: './device.component.html',
  styleUrls: ['./device.component.scss'],
  standalone: true,
  imports: [
    ...COMMON_MATERIAL_IMPORTS,
    DeviceStateComponent,
    WizardComponent
  ],
})
export class DeviceComponent implements OnInit { 

  public deviceAppState = DeviceAppState;

  ngOnInit(): void {
    console.log('[DeviceComponent] ngOnInit');
  }

}
