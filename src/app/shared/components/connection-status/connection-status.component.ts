import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { Component,
         OnInit,
         OnDestroy,
         input,
         effect,
         signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { COMMON_MATERIAL_IMPORTS } from '@shared/utils/material-imports';
import { DeviceConnectionStatusService } from '@services/device-connection-status/device-connection-status.service';


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
export class ConnectionStatusComponent implements OnInit, OnDestroy {

  private connectionStatusSignal = signal<boolean>(false);
  private subscription?: Subscription;

  deviceSN = input<string>('');
  readonly isConnected =this.connectionStatusSignal.asReadonly();
  
  constructor(private readonly deviceConnectionStatusService: DeviceConnectionStatusService) {

    effect(() => {

      const sn = this.deviceSN();
      
      if (this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = undefined;
      }
      
      if (sn) {
        this.subscription = this.deviceConnectionStatusService
          .onChange(sn)
          .subscribe(status => {
            this.connectionStatusSignal.set(status);
          });
      } else {
        this.connectionStatusSignal.set(false);
      }

    });

  }

  ngOnInit(): void {
    console.log('ConnectionStatusComponent INIT');
  }
  
  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  
}