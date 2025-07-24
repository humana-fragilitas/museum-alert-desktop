import { Observable, catchError, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { CompanyService } from '@services/company/company.service';
import { ApiResult, CompanyWithUserContext, DialogType, ErrorApiResponse } from '@models/.';
import { ErrorService } from '@services/error/error.service';


@Injectable({
  providedIn: 'root'
})
export class CompanyResolver implements Resolve<Observable<ApiResult<CompanyWithUserContext>>> {

  constructor(
    private companyService: CompanyService,
    private errorService: ErrorService
  ) {}

  resolve(): Observable<ApiResult<CompanyWithUserContext>> {
    return this.companyService.fetch().pipe(
      tap((response: ApiResult<CompanyWithUserContext>) => {
        console.log('[CompanyResolver]: resolved company data:', response);
      }),
      catchError((exception: HttpErrorResponse) => {
        console.error('[CompanyResolver]: failed to resolve company data:', exception.error as ErrorApiResponse);
        this.errorService.showModal({
          data: {
            type: DialogType.ERROR,
            title: 'ERRORS.APPLICATION.COMPANY_RETRIEVAL_FAILED_TITLE',
            message: 'ERRORS.APPLICATION.COMPANY_RETRIEVAL_FAILED_MESSAGE'
          },
          dialogConfig: { disableClose: true }
        });
        return throwError(() => exception);
      })
    );
  }
  
}