import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Hub } from '@aws-amplify/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { afterNextRender } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RedirectService {

  constructor(
    private authService: AuthService,
    private router: Router,
    private injector: Injector
  ) {

    this.authService.user$.subscribe((user) => {

      const redirectTarget = user ? ['/device'] : ['/index'];

      console.log(`Session ${user ? 'is valid' : 'expired' }: redirecting to ${redirectTarget[0]}`);
      
      /**
       * Redirecting to another page without waiting for next tick
       * causes an error in Amplify UI AuthenticatorComponent
       * ngOnDestroy lifecycle method
       */
      runInInjectionContext(this.injector, () => {
        afterNextRender(() => {
          this.router.navigate(redirectTarget);
        });
      });

    });

  }

}
