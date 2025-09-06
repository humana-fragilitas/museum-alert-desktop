export interface CompanyMember {
  email: string;
  username: string;
  role: CompanyRole;
  joinedAt: string; // ISO 8601 timestamp
}

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

export interface CompanyWithUserContext extends Company {
  userRole: string;
  userJoinedAt: string;
}
export interface UpdateCompanyRequest {
  companyName?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface UpdateCompanyResponse {
  message: string;
  company: Company;
  updatedFields: string[];
}

export type PartialCompanyUpdate = Pick<Company, 'companyName' | 'status'>;

export enum CompanyRole {
  OWNER = 'owner',
  MEMBER = 'member'
}

export enum CompanyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}