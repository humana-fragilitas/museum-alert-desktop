import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

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

@Injectable()
export class AuthTokenInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private authenticatorService: AuthenticatorService,
    private readonly dialogService: DialogService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const modifiedReq = this.addAuthToken(req);
    
    return next.handle(modifiedReq).pipe(
      catchError((error: HttpErrorResponse) => {

        if (error.status === 401) {
          this.handle401Error();
          return throwError(() => new AuthenticationExpiredError(error));
        }
        
        return throwError(() => error);

      })
    );
  }

  private addAuthToken(req: HttpRequest<any>): HttpRequest<any> {
  
    const idToken = this.authService
                        .sessionData
                        .value
                        ?.tokens
                        ?.idToken
                        ?.toString();


    const allowedBasePath = APP_CONFIG.aws.apiGateway;

    if (req.url.startsWith(allowedBasePath)) {
      const reqWithHeader = req.clone({
        headers: req.headers.set('Authorization', idToken!),
      });
      return reqWithHeader;
    }

    return req;

  }

  private handle401Error(): void {
    
    this.dialogService.showError(
      'Authentication expired',
      'Please log in again to continue.',
      '',
      { disableClose: true }
    ).subscribe(() => {
      this.authenticatorService.signOut();
    });

  }

}
