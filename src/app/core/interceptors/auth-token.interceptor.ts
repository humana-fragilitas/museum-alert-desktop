import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { APP_CONFIG } from '../../../environments/environment';
import { catchError, Observable, throwError } from 'rxjs';
import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { DialogService } from '../services/dialog/dialog.service';
import { DialogType } from '../models/ui.models';
import { HttpStatusCode } from '../models/api.models';

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
      if (error.status === HttpStatusCode.UNAUTHORIZED) {
        handle401Error(dialogService, authenticatorService);
        return throwError(() => new AuthenticationExpiredError(error));
      }
      return throwError(() => error);
    })
  );

};

function addAuthToken(req: HttpRequest<unknown>, authService: AuthService): HttpRequest<unknown> {

  const idToken = authService.idToken;
                            
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

  dialogService.openDialog({
    type: DialogType.ERROR,
    title: 'ERRORS.APPLICATION.AUTHENTICATION_EXPIRED_TITLE',
    message: 'ERRORS.APPLICATION.AUTHENTICATION_EXPIRED_MESSAGE'
  }, { disableClose: true }).subscribe(() => {
    authenticatorService.signOut();
  });

}