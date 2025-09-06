import { TranslatePipe } from '@ngx-translate/core';

import { Component,
         OnInit,
         signal,
         effect } from '@angular/core';
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
  
  readonly alarm = this.deviceService.alarm;
  readonly flashOnChange = signal<boolean>(false);

  constructor(private readonly deviceService: DeviceService) {
    
    effect(() => {
      const alarm = this.alarm();
      if (alarm) {
        this.flashOnChange.set(true);
        setTimeout(() => this.flashOnChange.set(false), 1000);
      }
    });
    
  }

  ngOnInit(): void {
    console.log('[DeviceDiagnosticsComponent]: INIT');
  }

}