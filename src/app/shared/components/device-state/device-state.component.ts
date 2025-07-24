import { TranslatePipe } from '@ngx-translate/core';

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

import { DeviceService } from '@services/device/device.service';
import { DeviceAppState } from '@shared-with-electron/.';
import { COMMON_MATERIAL_IMPORTS } from '@shared/utils/material-imports';


@Component({
  selector: 'app-device-state',
  templateUrl: './device-state.component.html',
  styleUrls: ['./device-state.component.scss'],
  imports: [
    CommonModule,
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS
  ]
})
export class DeviceStateComponent implements OnInit {
  
  readonly deviceAppState = DeviceAppState;
  
  // Convert observables to signals
  readonly usbConnectionStatus = toSignal(this.deviceService.usbConnectionStatus$);
  readonly deviceAppStatus = toSignal(this.deviceService.deviceAppStatus$);
  readonly portInfo = toSignal(this.deviceService.portInfo$);
  readonly serialNumber = toSignal(this.deviceService.serialNumber$);

  constructor(private readonly deviceService: DeviceService) {}

  ngOnInit(): void {
    console.log('DeviceStateComponent INIT');
  }
}