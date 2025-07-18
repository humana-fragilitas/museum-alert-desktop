// src/app/core/resolvers/company.resolver.ts
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable, of, catchError, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { CompanyService } from '../services/company/company.service';
import { CompanyWithUserContext, DialogType } from '../models';
import { NotificationService } from '../services/notification/notification.service';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogService } from '../services/dialog/dialog.service';

@Injectable({
  providedIn: 'root'
})
export class CompanyResolver implements Resolve<CompanyWithUserContext | null> {

  constructor(
    private companyService: CompanyService,
    private notificationService: NotificationService,
    private dialogService: DialogService
  ) {}

  resolve(): Observable<CompanyWithUserContext | null> {
    return this.companyService.get().pipe(
      map((response: CompanyWithUserContext | null) => {
        console.log('Company data resolved:', response);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
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