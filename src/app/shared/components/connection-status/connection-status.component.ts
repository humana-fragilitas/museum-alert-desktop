import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { Component, OnInit, OnDestroy, input, computed, effect, signal } from '@angular/core';
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
  // Convert @Input to input signal (Angular 19)
  deviceSN = input<string>('');
  
  // Signal to hold the connection status
  private connectionStatusSignal = signal<boolean>(false);
  
  // Public computed signal for template use
  public isConnected = computed(() => this.connectionStatusSignal());
  
  private subscription?: Subscription;

  constructor(
    private readonly deviceConnectionStatusService: DeviceConnectionStatusService
  ) {
    // Use effect to handle subscription management
    effect(() => {
      const sn = this.deviceSN();
      
      // Clean up previous subscription
      if (this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = undefined;
      }
      
      if (sn) {
        // Create new subscription when deviceSN changes
        this.subscription = this.deviceConnectionStatusService
          .onChange(sn)
          .subscribe(status => {
            this.connectionStatusSignal.set(status);
          });
      } else {
        // Reset to false when no device SN
        this.connectionStatusSignal.set(false);
      }
    });
  }

  ngOnInit(): void {
    console.log('ConnectionStatusComponent INIT');
  }
  
  ngOnDestroy(): void {
    // Clean up subscription on component destroy
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}