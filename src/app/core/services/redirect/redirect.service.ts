import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { afterNextRender } from '@angular/core';
import { DeviceService } from '../device/device.service';
import { combineLatest, distinctUntilChanged } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RedirectService {

  constructor(
    private authService: AuthService,
    private deviceService: DeviceService,
    private router: Router,
    private injector: Injector
  ) {

    combineLatest([
      this.authService.user$,
      this.deviceService.usbConnectionStatus$
    ]).pipe(
      distinctUntilChanged()
    ).subscribe(([user, isUsbConnected]) => {

      const currentUrl = this.router.url;

      console.log('Redirect service: current url: ', currentUrl);
      
      // Handle auth-based redirects (your original logic)
      if (!user && currentUrl !== '/index') {
        console.log('Session expired, redirecting to /index');
        this.navigateWithDelay(['/index']);
      } 
      // Handle USB connection redirects (your new requirement)
      else if (user && isUsbConnected && currentUrl !== '/device') {
        console.log('User authenticated and USB connected, redirecting to /device');
        this.navigateWithDelay(['/device']);
      }
      // Handle authenticated user without USB connection
      else if (user && !isUsbConnected && currentUrl === '/index') {
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
