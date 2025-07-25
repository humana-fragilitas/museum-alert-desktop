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
  
  // Convert BehaviorSubjects to signals
  private readonly companySignal = signal<Nullable<CompanyWithUserContext>>(null);
  private readonly isFetchingCompanySignal = signal<boolean>(false);

  // Maintain backward compatibility with observables
  public readonly company = this.companySignal;
  public readonly isFetchingCompany = this.isFetchingCompanySignal;

  // Convert getters to computed signals
  public readonly organization = this.companySignal.asReadonly();
  public readonly isOwner = computed(() => {
    const company = this.companySignal();
    return company?.userRole === CompanyRole.OWNER;
  });

  // Convert AuthService sessionData$ to signal for use in effects
  private readonly sessionDataSignal = this.authService.sessionData;

  constructor(private httpClient: HttpClient, private authService: AuthService) {
    
    // Replace the constructor subscription with an effect
    // This preserves the exact same behavior as the original switchMap logic
    effect(() => {
      const session = this.sessionDataSignal();
      
      if (session) {
        // Call fetch and handle the same way as the original subscription
        this.fetch().pipe(
          catchError(exception => {
            console.error('[CompanyService]: failed to load company data:',
              exception.error as ErrorApiResponse);
            return EMPTY;
          })
        ).subscribe(); // We still need to subscribe to trigger the HTTP call
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
        const currentCompany = this.companySignal(); // Use signal instead of .value
        if (currentCompany) {
          const updatedCompanyWithContext: CompanyWithUserContext = {
            ...(response as SuccessApiResponse<UpdateCompanyResponse>).data.company,
            userRole: currentCompany.userRole,
            userJoinedAt: currentCompany.userJoinedAt
          };
          this.companySignal.set(updatedCompanyWithContext); // Use .set() instead of .next()
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
    this.isFetchingCompanySignal.set(true); // Use .set() instead of .next()
    
    return this.httpClient.get<ApiResult<CompanyWithUserContext>>(apiUrl).pipe(
      tap((response: ApiResult<CompanyWithUserContext>) => {
        if ('data' in response) {
          this.companySignal.set(response.data); // Use .set() instead of .next()
        }
      }),
      catchError((exception: HttpErrorResponse) => {
        console.error('[CompanyService]: error fetching company:', exception.error as ErrorApiResponse);
        return throwError(() => exception);
      }),
      finalize(() => {
        this.isFetchingCompanySignal.set(false); // Use .set() instead of .next()
      })
    );
  }

  clear(): void {
    this.companySignal.set(null); // Use .set() instead of .next()
  }
}