import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth/auth.service';

export const userSessionGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authService.user$.pipe(
    map(user => {
      if (user) {
        console.log('User session valid, allowing access');
        return true;
      } else {
        console.log('No valid user session, redirecting to index');
        router.navigate(['/index']);
        return false;
      }
    })
  );

};