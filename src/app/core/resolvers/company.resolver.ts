// src/app/core/resolvers/company.resolver.ts
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { CompanyService } from '../services/company/company.service';
import { ApiResult, CompanyWithUserContext, DialogType, ErrorApiResponse } from '../models';
import { DialogService } from '../services/dialog/dialog.service';

@Injectable({
  providedIn: 'root'
})
export class CompanyResolver implements Resolve<Observable<ApiResult<CompanyWithUserContext>>> {

  constructor(
    private companyService: CompanyService,
    private dialogService: DialogService
  ) {}

  resolve(): Observable<ApiResult<CompanyWithUserContext>> {
    return this.companyService.get().pipe(
      map((response: ApiResult<CompanyWithUserContext>) => {
        console.log('Company data resolved:', response);
        return response;
      }),
      catchError((error: ErrorApiResponse) => {
        // TO DO: EXCLUDE EXPIRED SESSION ERRORS HERE!
        console.error('Failed to resolve company data:', error);
          this.dialogService.openDialog({
            type: DialogType.ERROR,
            title: 'ERRORS.APPLICATION.COMPANY_RETRIEVAL_FAILED_TITLE',
            message: 'ERRORS.APPLICATION.COMPANY_RETRIEVAL_FAILED_MESSAGE'
          }, { disableClose: true });
        return throwError(() => error);
      })
    );
  }
  
}