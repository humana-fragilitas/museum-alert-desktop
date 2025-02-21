import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from 'src/app/shared/auth.service';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);
  
  const idToken = authService
                    .sessionData
                    .value
                    ?.tokens
                    ?.idToken
                    ?.toString();

  const reqWithHeader = req.clone({
    headers: req.headers.set('Authorization', idToken!),
  });

  return next(reqWithHeader);

};
