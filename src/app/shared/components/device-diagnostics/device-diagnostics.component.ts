import { Component, OnDestroy, OnInit } from '@angular/core';
import { DeviceService } from '../../../core/services/device/device.service';
import { FormatDistancePipe } from '../../pipes/format-distance.pipe';
import { Subscription } from 'rxjs';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-device-diagnostics',
  templateUrl: './device-diagnostics.component.html',
  styleUrls: ['./device-diagnostics.component.scss'],
  imports: [
    AsyncPipe,
    MatCardModule,
    CommonModule,
    FormatDistancePipe
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
