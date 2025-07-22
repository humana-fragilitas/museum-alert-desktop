import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, EMPTY, finalize, Observable, switchMap, tap, throwError } from 'rxjs';
import { APP_CONFIG } from '../../../../environments/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { SuccessApiResponse, ApiResult, ErrorApiResponse } from '../../models';
import { CompanyWithUserContext, UpdateCompanyRequest, UpdateCompanyResponse, CompanyRole } from '../../models';
import { AuthSession } from 'aws-amplify/auth';


@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private readonly company = new BehaviorSubject<Nullable<CompanyWithUserContext>>(null);
  private readonly isFetchingCompany = new BehaviorSubject<boolean>(false);

  public readonly company$ = this.company.asObservable();
  public readonly isFetchingCompany$ = this.isFetchingCompany.asObservable();

  constructor(private httpClient: HttpClient, private authService: AuthService) {

    this.authService.sessionData$.pipe(
      switchMap((session: Nullable<AuthSession>) => {
        if (session) {
          return this.fetch().pipe(
            catchError(exception => {
              console.error('[CompanyService]: failed to load company data:',
                            exception.error as ErrorApiResponse);
              return EMPTY;
            })
          );
        } else {
          this.clear();
          return EMPTY;
        }
      })
    ).subscribe();

  }

  setName(company: UpdateCompanyRequest): Observable<ApiResult<UpdateCompanyResponse>> {

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/company`;
    
    return this.httpClient.put<ApiResult<UpdateCompanyResponse>>(apiUrl, { companyName: company.companyName }).pipe(
      tap((response: ApiResult<UpdateCompanyResponse>) => {

        // Preserve user context from current company data
        const currentCompany = this.company.value;

        if (currentCompany) {
          const updatedCompanyWithContext: CompanyWithUserContext = {
            ...(response as SuccessApiResponse<UpdateCompanyResponse>).data.company,
            userRole: currentCompany.userRole,
            userJoinedAt: currentCompany.userJoinedAt
          };
          this.company.next(updatedCompanyWithContext);
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
    
    this.isFetchingCompany.next(true);

    return this.httpClient.get<ApiResult<CompanyWithUserContext>>(apiUrl).pipe(
      tap((response: ApiResult<CompanyWithUserContext>) => {
        if ('data' in response) {
          this.company.next(response.data);
        }
      }),
      catchError((exception: HttpErrorResponse) => {
        console.error('[CompanyService]: error fetching company:', exception.error as ErrorApiResponse);
        return throwError(() => exception);
      }),
      finalize(() => {
        this.isFetchingCompany.next(false);
      })
    );

  }

  get organization(): Nullable<CompanyWithUserContext> {
    return this.company.value;
  }

  get isOwner(): boolean {
    const company = this.organization;
    return company?.userRole === CompanyRole.OWNER;
  }

  clear(): void {
    this.company.next(null);
  }
  
}
