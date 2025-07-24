import { map } from 'rxjs/operators';

import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '@services/auth/auth.service';


// Authenticated user trying to access public only route
export const publicOnlyGuard: CanActivateFn = (route, state) => {

  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.user$.pipe(
    map(user => {
      if (user) {
        console.log(`[publicOnlyGuard]: authenticated user is not allowed ` +
                    `to browse public only route '${state.url}'; redirecting to /device`);
        router.navigate(['/device']);
        return false;
      }
      console.log(`[publicOnlyGuard]: non authenticated user is allowed ` +
                  `to browse public only route '${state.url}'`);
      return true;
    })
  );
  
};