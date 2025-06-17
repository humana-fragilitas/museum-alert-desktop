import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap } from 'rxjs';
import { APP_CONFIG } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';


export interface CompanyMember {
  email: string;
  username: string;
  role: 'owner' | 'member' | 'admin';
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
  status?: 'active' | 'inactive' | 'suspended';
}

/**
 * Response from GET /company endpoint
 */
export interface GetCompanyResponse {
  company: CompanyWithUserContext;
}

/**
 * Response from PUT /company endpoint
 */
export interface UpdateCompanyResponse {
  message: string;
  company: Company;
  updatedFields: string[];
}

// ===== ERROR RESPONSE INTERFACES =====

/**
 * Standard API error response
 */


// ===== PARTIAL/UTILITY INTERFACES =====

/**
 * Company creation data (for post-confirmation Lambda)
 */
export interface CreateCompanyData {
  companyId: string;
  companyName: string;
  ownerEmail: string;
  ownerUsername: string;
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
  ADMIN = 'admin',
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

  // Private BehaviorSubject to store company data
  private companySubject = new BehaviorSubject<CompanyWithUserContext | null>(null);
  
  // Public observable for components to subscribe to
  public company$ = this.companySubject.asObservable();
  

  constructor(
    private httpClient: HttpClient,
    private authService: AuthService
  ) {

    this.authService.sessionData.subscribe((session) => {
      if (session) {
        this.get().subscribe();
      } else {
        this.clearCompanyData();
      }
    });

  }
  
  // TO DO: use ApiRespnse<T> and CompanyWithUserContext
  setName(companyName: string): Observable<any> {

     const apiUrl = `${APP_CONFIG.aws.apiGateway}/company`;

     return this.httpClient.put(apiUrl, { companyName }).pipe(
      tap((response: any) => {
        // Update the stored company data with new information
        const currentCompany = this.currentCompany;
        if (currentCompany) {
          const updatedCompany: CompanyWithUserContext = {
            ...currentCompany,
            ...response.data,
            userRole: currentCompany.userRole, // Preserve user context
            userJoinedAt: currentCompany.userJoinedAt
          };

          console.log('Company updated:', updatedCompany);
          this.companySubject.next(updatedCompany);
        }
      }),
      catchError((error) => {
        console.error('Error updating company name:', error);
        throw error; // Re-throw for component handling
      })
    )

  }

  /**
   * Get company data (loads fresh from API)
   */
  get(): Observable<GetCompanyResponse> {
    const apiUrl = `${APP_CONFIG.aws.apiGateway}/company`;
  

    return this.httpClient.get<any>(apiUrl).pipe(
      tap((response) => {
        // Store the company data in BehaviorSubject
        this.companySubject.next(response.data.company);

      }),
      catchError((error) => {
        console.error('Error fetching company:', error);
        // Handle specific error cases
        if (error.status === 404) {
          this.companySubject.next(null);
        }
        
        throw error;
      })
    );
  }

    /**
   * Get current company value (synchronous)
   */
  get currentCompany(): CompanyWithUserContext | null {
    return this.companySubject.value;
  }

  /**
   * Check if user is company owner
   */
  get isOwner(): boolean {
    const company = this.currentCompany;
    return company?.userRole === CompanyRole.OWNER;
  }

    /**
   * Clear company data (useful for logout)
   */
  clearCompanyData(): void {
    this.companySubject.next(null);
  }

  /**
   * Check if company data is loaded
   */
  get hasCompanyData(): boolean {
    return this.currentCompany !== null;
  }

}
