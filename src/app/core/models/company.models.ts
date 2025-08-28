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