import { AuthSession } from 'aws-amplify/auth';

import { Injectable,
         Injector,
         runInInjectionContext,
         computed,
         effect,
         Signal } from '@angular/core';
import { Router } from '@angular/router';
import { afterNextRender } from '@angular/core';

import { AuthService } from '@services/auth/auth.service';
import { DeviceService } from '@services/device/device.service';


@Injectable({
  providedIn: 'root'
})
export class RedirectService {

  private readonly redirectState: Signal<{
    session: Signal<Nullable<AuthSession>>;
    isUsbConnected: Signal<boolean>;
  }>;

  constructor(private authService: AuthService,
              private deviceService: DeviceService,
              private router: Router,
              private injector: Injector) {
    
    this.redirectState = computed(() => ({
      session: this.authService.sessionData,
      isUsbConnected: this.deviceService.usbConnectionStatus
    }));

    effect(() => {
      const { session, isUsbConnected } = this.redirectState();
      const currentUrl = this.router.url;
      console.log('Redirect service: current url: ', currentUrl);
      if (!session() && currentUrl !== '/index') {
        console.log('Session expired, redirecting to /index');
        this.navigateWithDelay(['/index']);
      }
      else if (session() && isUsbConnected() && currentUrl !== '/device') {
        console.log('User authenticated and USB connected, redirecting to /device');
        this.navigateWithDelay(['/device']);
      }
      else if (session() && !isUsbConnected() && currentUrl === '/index') {
        console.log('User authenticated but no USB connected, could redirect to profile or stay');
        this.navigateWithDelay(['/device']);
      }
    });

  }

  // Note: prevents Amplify UI components routing conflicts
  private navigateWithDelay(target: string[]): void {
    runInInjectionContext(this.injector, () => {
      afterNextRender(() => {
        this.router.navigate(target);
      });
    });
  }

}