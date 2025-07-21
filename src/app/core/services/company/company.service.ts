import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, finalize, map, Observable, of, tap, throwError } from 'rxjs';
import { APP_CONFIG } from '../../../../environments/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { SuccessApiResponse, ApiResult, ErrorApiResponse } from '../../models';
import { NotificationService } from '../notification/notification.service';
import { CompanyWithUserContext, UpdateCompanyRequest, UpdateCompanyResponse, CompanyRole } from '../../models';


@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private readonly company = new BehaviorSubject<Nullable<CompanyWithUserContext>>(null);
  private readonly isFetchingCompany = new BehaviorSubject<boolean>(false);

  public readonly company$ = this.company.asObservable();
  public readonly isFetchingCompany$ = this.isFetchingCompany.asObservable();

  constructor(
    private httpClient: HttpClient,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {

    this.authService.sessionData$.subscribe((session) => {
      if (session) {
        this.get().subscribe();
      } else {
        this.clear();
      }
    });

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
        console.error('Error updating company name:', exception);
        return throwError(() => exception.error as ErrorApiResponse);
      })

    );

  }

  /**
   * Get company data (loads fresh from API)
   */
  get(): Observable<ApiResult<CompanyWithUserContext>> {

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/company`;
    
    this.isFetchingCompany.next(true);

    return this.httpClient.get<ApiResult<CompanyWithUserContext>>(apiUrl).pipe(
      tap(
        (response: ApiResult<CompanyWithUserContext>) => {
          if ('data' in response) {
            this.company.next(response.data);
          }
        }
      ),
      catchError((exception: HttpErrorResponse) => {
        console.error('Error fetching company:', exception);
        return throwError(() => exception.error as ErrorApiResponse);
      }),
      finalize(() => {
        this.isFetchingCompany.next(false);
      })
    );

  }

  get currentCompany(): Nullable<CompanyWithUserContext> {
    return this.company.value;
  }

  get isOwner(): boolean {
    const company = this.currentCompany;
    return company?.userRole === CompanyRole.OWNER;
  }

  clear(): void {
    this.company.next(null);
  }

  get hasCompanyData(): boolean {
    return this.currentCompany !== null;
  }

}
