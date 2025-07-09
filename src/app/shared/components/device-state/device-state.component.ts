import { Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceService } from '../../../core/services/device/device.service';
import { DeviceAppState } from '../../../../../app/shared/models';
import { CommonModule } from '@angular/common';
import { COMMON_MATERIAL_IMPORTS } from '../../utils/material-imports';

@Component({
  selector: 'app-device-state',
  templateUrl: './device-state.component.html',
  styleUrls: ['./device-state.component.scss'],
  imports: [ 
    CommonModule,
    ...COMMON_MATERIAL_IMPORTS
  ]
})
export class DeviceStateComponent implements OnInit {

  public readonly deviceAppState = DeviceAppState;

  constructor(public readonly deviceService: DeviceService) {}

  ngOnInit(): void {

    console.log('DeviceStateComponent INIT');

  }

}
