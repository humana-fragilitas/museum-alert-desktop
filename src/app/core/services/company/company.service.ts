import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, finalize, map, Observable, of, tap, throwError } from 'rxjs';
import { APP_CONFIG } from '../../../../environments/environment';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { ErrorApiResponse, HttpStatusCode, SuccessApiResponse } from '../shared/interfaces';
import { NotificationService } from '../notification/notification.service';
import { ErrorType } from '../../../../../app/shared/models';
import { AuthenticationExpiredError } from '../../interceptors/auth-token.interceptor';


export interface CompanyMember {
  email: string;
  username: string;
  role: CompanyRole;
  joinedAt: string; // ISO 8601 timestamp
}

/**
 * Core company interface - matches DynamoDB structure
 */
export interface Company {
  companyId: string;
  companyName: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  ownerEmail: string;
  ownerUsername: string;
  memberCount: number;
  members: CompanyMember[];
}

/**
 * Extended company interface with user-specific context
 * Used by GET /company endpoint
 */
export interface CompanyWithUserContext extends Company {
  userRole: string;
  userJoinedAt: string;
}

// ===== API REQUEST/RESPONSE INTERFACES =====

/**
 * Request body for updating company
 * Used by PUT /company endpoint
 */
export interface UpdateCompanyRequest {
  companyName?: string;
  // TO DO: this should not be possible!
  status?: 'active' | 'inactive' | 'suspended';
}

/**
 * Response from PUT /company endpoint
 */
export interface UpdateCompanyResponse {
  message: string;
  company: Company;
  updatedFields: string[];
}

/**
 * Partial company for updates (only updateable fields)
 */
export type PartialCompanyUpdate = Pick<Company, 'companyName' | 'status'>;

/**
 * Company member roles enum
 */
export enum CompanyRole {
  OWNER = 'owner',
  MEMBER = 'member'
}

/**
 * Company status enum
 */
export enum CompanyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  private readonly company = new BehaviorSubject<
    Nullable<CompanyWithUserContext>
  >(null);
  private readonly isFetchingCompany = new BehaviorSubject<
    boolean
  >(false);

  public readonly company$ = this.company.asObservable();
  public readonly isFetchingCompany$ = this.isFetchingCompany.asObservable();

  constructor(
    private httpClient: HttpClient,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {

    this.authService.sessionData.subscribe((session) => {
      if (session) {
        this.get().subscribe();
      } else {
        this.clear();
      }
    });

  }

  setName(company: UpdateCompanyRequest): Observable<
    SuccessApiResponse<UpdateCompanyResponse>
  > {

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/company`;
    
    return this.httpClient.put<
      SuccessApiResponse<UpdateCompanyResponse>
    >(apiUrl, { companyName: company.companyName }).pipe(
      tap((response: SuccessApiResponse<UpdateCompanyResponse>) => {

        // Preserve user context from current company data
        const currentCompany = this.company.value;

        if (currentCompany) {
          const updatedCompanyWithContext: CompanyWithUserContext = {
            ...response.data.company,
            userRole: currentCompany.userRole,
            userJoinedAt: currentCompany.userJoinedAt
          };
          this.company.next(updatedCompanyWithContext);
        }

      }),
      catchError((exception: HttpErrorResponse) => {
        console.error('Error updating company name:', exception);
        return throwError(() => exception);
      })

    );

  }

  /**
   * Get company data (loads fresh from API)
   */
  get(): Observable<Nullable<CompanyWithUserContext>> {

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/company`;
    
    this.isFetchingCompany.next(true);

    return this.httpClient.get<
      SuccessApiResponse<CompanyWithUserContext>
    >(apiUrl).pipe(

      tap(
        (response: SuccessApiResponse<CompanyWithUserContext>) => {
          this.company.next(response.data);
        }
      ),

      map(
        (response: SuccessApiResponse<CompanyWithUserContext>) => 
          response.data
      ),

      catchError((exception: HttpErrorResponse) => {
        console.error('Error fetching company:', exception);
        return throwError(() => exception);
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
