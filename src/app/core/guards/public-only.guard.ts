// core/guards/public-only.guard.ts
import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth/auth.service';

export const publicOnlyGuard: CanActivateFn = (route, state) => {

  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authService.user$.pipe(
    map(user => {
      if (user) {
        // Authenticated user trying to access public route
        router.navigate(['/device']);
        return false;
      }
      return true;
    })
  );
  
};