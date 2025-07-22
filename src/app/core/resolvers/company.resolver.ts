// src/app/core/resolvers/company.resolver.ts
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { EMPTY, Observable, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { CompanyService } from '../services/company/company.service';
import { ApiResult, CompanyWithUserContext, DialogType, ErrorApiResponse } from '../models';
import { DialogService } from '../services/dialog/dialog.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthenticationExpiredError } from '../interceptors/auth-token.interceptor';
import { ErrorService } from '../services/error/error.service';


@Injectable({
  providedIn: 'root'
})
export class CompanyResolver implements Resolve<Observable<ApiResult<CompanyWithUserContext>>> {

  constructor(
    private companyService: CompanyService,
    private dialogService: DialogService,
    private errorService: ErrorService
  ) {}

  resolve(): Observable<ApiResult<CompanyWithUserContext>> {
    return this.companyService.get().pipe(
      map((response: ApiResult<CompanyWithUserContext>) => {
        console.log('[CompanyResolver]: resolved company data:', response);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('[CompanyResolver]: failed to resolve company data:', error);
        this.errorService.showModal(error, {
          type: DialogType.ERROR,
          title: 'ERRORS.APPLICATION.COMPANY_RETRIEVAL_FAILED_TITLE',
          message: 'ERRORS.APPLICATION.COMPANY_RETRIEVAL_FAILED_MESSAGE'
        }, { disableClose: true });
        return throwError(() => error);
      })
    );
  }
  
}