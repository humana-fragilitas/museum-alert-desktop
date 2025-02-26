import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {

  const authService = inject(AuthService);
  
  const idToken = authService
                    .sessionData
                    .value
                    ?.tokens
                    ?.idToken
                    ?.toString();


  const allowedBasePath = environment.aws.apiGateway;

  if (req.url.startsWith(allowedBasePath)) {
    const reqWithHeader = req.clone({
      headers: req.headers.set('Authorization', idToken!),
    });
    return next(reqWithHeader);
  }

  return next(req);

};
