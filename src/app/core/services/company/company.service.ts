import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
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
export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: any;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  statusCode: number;
  body: T | ApiErrorResponse;
}

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

  constructor(
    private httpClient: HttpClient,
    private authService: AuthService
  ) {

    this.get().subscribe();

  }
 
  setName(companyName: string): Observable<any> {

     const apiUrl = `${APP_CONFIG.aws.apiGateway}/company`;

     return this.httpClient.put(apiUrl, { companyName });

  }

  get(): Observable<any> {

    const apiUrl = `${APP_CONFIG.aws.apiGateway}/company`;

    return this.httpClient.get(apiUrl);

  }

}
