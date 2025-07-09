import { Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceService } from '../../../core/services/device/device.service';
import { FormatDistancePipe } from '../../pipes/format-distance.pipe';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { COMMON_MATERIAL_IMPORTS } from '../../utils/material-imports';

@Component({
  selector: 'app-device-diagnostics',
  templateUrl: './device-diagnostics.component.html',
  styleUrls: ['./device-diagnostics.component.scss'],
  imports: [
    CommonModule,
    FormatDistancePipe,
    ...COMMON_MATERIAL_IMPORTS
  ]
})
export class DeviceDiagnosticsComponent implements OnInit, OnDestroy {

  private alarmSubscription!: Subscription;
  public flashOnChange = false;

  constructor(
    public readonly deviceService: DeviceService
  ) {};

  ngOnInit(): void {

    console.log('DeviceDiagnosticsComponent INIT');

    this.alarmSubscription = this.deviceService.alarm$.subscribe((alarm) => {  
      this.flashOnChange = true;
      console.log('flashOnChange:', alarm);
        setTimeout(() => this.flashOnChange = false, 1000);
      });

  }

  ngOnDestroy(): void {
    this.alarmSubscription?.unsubscribe();
  }

}
