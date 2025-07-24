import { AuthUser } from 'aws-amplify/auth';

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

  // Create a computed signal that combines both values
  private readonly redirectState: Signal<{
    user: Signal<Nullable<AuthUser>>;
    isUsbConnected: Signal<boolean>;
  }>;

  constructor(
    private authService: AuthService,
    private deviceService: DeviceService,
    private router: Router,
    private injector: Injector
  ) {
    
    this.redirectState = computed(() => ({
      user: this.authService.user,
      isUsbConnected: this.deviceService.usbConnectionStatus
    }));

    // Replace combineLatest subscription with effect
    // The effect automatically handles distinctUntilChanged behavior since signals only emit when values change
    effect(() => {
      const { user, isUsbConnected } = this.redirectState();
      const currentUrl = this.router.url;
      console.log('Redirect service: current url: ', currentUrl);
      // Handle auth-based redirects (your original logic)
      if (!user() && currentUrl !== '/index') {
        console.log('Session expired, redirecting to /index');
        this.navigateWithDelay(['/index']);
      }
      // Handle USB connection redirects (your new requirement)
      else if (user() && isUsbConnected() && currentUrl !== '/device') {
        console.log('User authenticated and USB connected, redirecting to /device');
        this.navigateWithDelay(['/device']);
      }
      // Handle authenticated user without USB connection
      else if (user() && !isUsbConnected() && currentUrl === '/index') {
        console.log('User authenticated but no USB connected, could redirect to profile or stay');
        this.navigateWithDelay(['/device']);
      }
    });

  }

  private navigateWithDelay(target: string[]): void {
    runInInjectionContext(this.injector, () => {
      afterNextRender(() => {
        this.router.navigate(target);
      });
    });
  }

}