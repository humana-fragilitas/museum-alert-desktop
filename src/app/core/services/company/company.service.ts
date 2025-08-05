import { catchError, EMPTY, finalize, Observable, tap, throwError } from 'rxjs';

import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { APP_CONFIG } from '@env/environment';
import { AuthService } from '@services/auth/auth.service';
import { SuccessApiResponse, ApiResult, ErrorApiResponse, CompanyWithUserContext, UpdateCompanyRequest, UpdateCompanyResponse, CompanyRole } from '@models';


@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  
  private readonly companySignal = signal<Nullable<CompanyWithUserContext>>(null);
  private readonly isFetchingCompanySignal = signal<boolean>(false);
  private readonly sessionDataSignal = this.authService.sessionData;

  readonly company = this.companySignal;
  readonly isFetchingCompany = this.isFetchingCompanySignal;

  readonly organization = this.companySignal.asReadonly();
  readonly isOwner = computed(() => {
    const company = this.companySignal();
    return company?.userRole === CompanyRole.OWNER;
  });

  constructor(private httpClient: HttpClient, private authService: AuthService) {
    
    effect(() => {
      const session = this.sessionDataSignal();
      if (session) {
        this.fetch().pipe(
          catchError(exception => {
            console.error('[CompanyService]: failed to load company data:',
              exception.error as ErrorApiResponse);
            return EMPTY;
          })
        ).subscribe();
      } else {
        this.clear();
      }
    });

  }

  setName(company: UpdateCompanyRequest): Observable<ApiResult<UpdateCompanyResponse>> {

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/company`;
    return this.httpClient.put<ApiResult<UpdateCompanyResponse>>(apiUrl, { companyName: company.companyName }).pipe(
      tap((response: ApiResult<UpdateCompanyResponse>) => {
        const currentCompany = this.companySignal();
        if (currentCompany) {
          const updatedCompanyWithContext: CompanyWithUserContext = {
            ...(response as SuccessApiResponse<UpdateCompanyResponse>).data.company,
            userRole: currentCompany.userRole,
            userJoinedAt: currentCompany.userJoinedAt
          };
          this.companySignal.set(updatedCompanyWithContext);
        }
      }),
      catchError((exception: HttpErrorResponse) => {
        console.error('[CompanyService]: error updating company name:',
          exception.error as ErrorApiResponse);
        return throwError(() => exception);
      })
    );

  }

  /**
   * Get company data (loads fresh from API)
   */
  fetch(): Observable<ApiResult<CompanyWithUserContext>> {

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/company`;
    this.isFetchingCompanySignal.set(true);
    
    return this.httpClient.get<ApiResult<CompanyWithUserContext>>(apiUrl).pipe(
      tap((response: ApiResult<CompanyWithUserContext>) => {
        if ('data' in response) {
          this.companySignal.set(response.data);
        }
      }),
      catchError((exception: HttpErrorResponse) => {
        console.error('[CompanyService]: error fetching company:', exception.error as ErrorApiResponse);
        return throwError(() => exception);
      }),
      finalize(() => {
        this.isFetchingCompanySignal.set(false);
      })
    );
    
  }

  clear(): void {
    this.companySignal.set(null);
  }

}