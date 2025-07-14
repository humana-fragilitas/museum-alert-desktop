import { Component, Input, OnInit } from '@angular/core';
import { MqttService } from '../../../core/services/mqtt/mqtt.service';
import { distinctUntilChanged, map, Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { COMMON_MATERIAL_IMPORTS } from '../../utils/material-imports';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-connection-status',
  templateUrl: './connection-status.component.html',
  styleUrls: ['./connection-status.component.scss'],
  imports: [
    CommonModule,
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS
  ]
})
export class ConnectionStatusComponent implements OnInit {

  @Input() deviceSN: string = '';
  public deviceConnectionStatus$!: Observable<boolean>;

  constructor(
    public readonly mqttService: MqttService
  ) {};

  ngOnInit(): void {

    console.log('ConnectionStatusComponent INIT');

    this.deviceConnectionStatus$ = this.mqttService.devicesConnectionStatus$.pipe(
      map((statusMap: Map<string, boolean>) => {
        const status = statusMap.get(this.deviceSN) ?? false;
        console.log(`Device ${this.deviceSN} status:`, status);
        return status;
      }),
      distinctUntilChanged()
    );

  }

}
