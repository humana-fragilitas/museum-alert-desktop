import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { APP_CONFIG } from '../../../environments/environment';
import { catchError, Observable, throwError } from 'rxjs';
import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { DialogService } from '../services/dialog/dialog.service';

// Custom error class to distinguish handled 401s
export class AuthenticationExpiredError extends Error {
  constructor(public originalError: HttpErrorResponse) {
    super('Authentication expired');
    this.name = 'AuthenticationExpiredError';
  }
}

export const authTokenInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {

  const authService = inject(AuthService);
  const authenticatorService = inject(AuthenticatorService);
  const dialogService = inject(DialogService);

  const modifiedReq = addAuthToken(req, authService);
  
  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        handle401Error(dialogService, authenticatorService);
        return throwError(() => new AuthenticationExpiredError(error));
      }
      return throwError(() => error);
    })
  );
};

function addAuthToken(req: HttpRequest<any>, authService: AuthService): HttpRequest<any> {
  const idToken = authService.sessionData
    .value
    ?.tokens
    ?.idToken
    ?.toString();
  
  const allowedBasePath = APP_CONFIG.aws.apiGateway;
  
  if (req.url.startsWith(allowedBasePath) && idToken) {
    const reqWithHeader = req.clone({
      headers: req.headers.set('Authorization', idToken),
    });
    return reqWithHeader;
  }
  return req;
}

function handle401Error(dialogService: DialogService, authenticatorService: AuthenticatorService) {
  
  dialogService.showError(
    'Authentication expired',
    'Please log in again to continue.',
    '',
    { disableClose: true }
  ).subscribe(() => {
    authenticatorService.signOut();
  });

}