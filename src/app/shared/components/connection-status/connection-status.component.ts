import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { MqttService } from '../../../core/services/mqtt/mqtt.service';
import { distinctUntilChanged, map, Observable, Subscription } from 'rxjs';
import { MatChipsModule } from '@angular/material/chips';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-connection-status',
  templateUrl: './connection-status.component.html',
  styleUrls: ['./connection-status.component.scss'],
  imports: [
    MatChipsModule,
    AsyncPipe
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
