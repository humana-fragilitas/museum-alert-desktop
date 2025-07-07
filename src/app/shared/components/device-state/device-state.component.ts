import { Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceService } from '../../../core/services/device/device.service';
import { DeviceAppState } from '../../../../../app/shared/models';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-device-state',
  templateUrl: './device-state.component.html',
  styleUrls: ['./device-state.component.scss'],
  imports: [ 
    AsyncPipe,
    CommonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ]
})
export class DeviceStateComponent implements OnInit, OnDestroy {

  public readonly deviceAppState = DeviceAppState;

  constructor(public readonly deviceService: DeviceService) {};

  ngOnInit(): void {

    console.log('DeviceStateComponent INIT');

  }

  ngOnDestroy(): void {

  }

}
