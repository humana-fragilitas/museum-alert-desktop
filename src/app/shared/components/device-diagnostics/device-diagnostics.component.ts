import { TranslatePipe } from '@ngx-translate/core';

import { Component, OnInit, signal, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';

import { DeviceService } from '@services/device/device.service';
import { FormatDistancePipe } from '@pipes/format-distance.pipe';
import { COMMON_MATERIAL_IMPORTS } from '@shared/utils/material-imports';


@Component({
  selector: 'app-device-diagnostics',
  templateUrl: './device-diagnostics.component.html',
  styleUrls: ['./device-diagnostics.component.scss'],
  imports: [
    CommonModule,
    FormatDistancePipe,
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS
  ]
})
export class DeviceDiagnosticsComponent implements OnInit {
  
  // Convert observable to signal
  public readonly alarm = this.deviceService.alarm;
  
  // Convert flashOnChange to signal
  public flashOnChange = signal<boolean>(false);

  constructor(public readonly deviceService: DeviceService) {
    
    // Replace subscription with effect for alarm changes
    effect(() => {
      const alarm = this.alarm();
      if (alarm) {
        this.flashOnChange.set(true);
        console.log('flashOnChange:', alarm);
        setTimeout(() => this.flashOnChange.set(false), 1000);
      }
    });
    
  }

  ngOnInit(): void {
    console.log('DeviceDiagnosticsComponent INIT');
  }
}