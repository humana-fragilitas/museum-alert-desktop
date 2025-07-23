import { Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DeviceService } from '../../../core/services/device/device.service';
import { FormatDistancePipe } from '../../pipes/format-distance.pipe';
import { CommonModule } from '@angular/common';
import { COMMON_MATERIAL_IMPORTS } from '../../utils/material-imports';
import { TranslatePipe } from '@ngx-translate/core';

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
  public flashOnChange = false;

  constructor(public readonly deviceService: DeviceService) {

    this.deviceService.alarm$
      .pipe(takeUntilDestroyed())
      .subscribe((alarm) => {
        this.flashOnChange = true;
        console.log('flashOnChange:', alarm);
        setTimeout(() => this.flashOnChange = false, 1000);
      });

  }

  ngOnInit(): void {

    console.log('DeviceDiagnosticsComponent INIT');
    
  }

}