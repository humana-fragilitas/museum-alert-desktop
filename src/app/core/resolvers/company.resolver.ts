// src/app/core/resolvers/company.resolver.ts
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable, of, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { CompanyService, CompanyWithUserContext } from '../services/company/company.service';
import { NotificationService } from '../services/notification/notification.service';
import { AppErrorType, ErrorType } from '../../../../app/shared/models';
import { AuthenticationExpiredError } from '../interceptors/auth-token.interceptor';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class CompanyResolver implements Resolve<CompanyWithUserContext | null> {

  constructor(
    private companyService: CompanyService,
    private notificationService: NotificationService
  ) {}

  resolve(): Observable<CompanyWithUserContext | null> {
    return this.companyService.get().pipe(
      map((response: CompanyWithUserContext | null) => {
        console.log('Company data resolved:', response);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Failed to resolve company data:', error);
          this.notificationService.onError(
            ErrorType.APP_ERROR,
            AppErrorType.FAILED_COMPANY_RETRIEVAL,
            error
          );
        return throwError(() => error);
      })
    );
  }
}