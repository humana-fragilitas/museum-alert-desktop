import { map } from 'rxjs/operators';

import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';

import { AuthService } from '@services/auth/auth.service';


export const userSessionGuard: CanActivateFn = (route, state) => {

  const authService = inject(AuthService);
  const router = inject(Router);
  
  return toObservable(authService.sessionData).pipe(
    map(session => {
      if (session) {
        console.log(`[userSessionGuard]: authenticated user is allowed to browse ` +
          `private only route '${state.url}'`);
        return true;
      } else {
        console.log(`[userSessionGuard]: authenticated user is not allowed to browse ` +
          `private only route '${state.url}'; redirecting to /index`);
        router.navigate(['/index']);
        return false;
      }
    })
  );

};