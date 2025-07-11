import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { CompanyService } from './company.service';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../notification/notification.service';
import { CompanyWithUserContext, UpdateCompanyRequest, UpdateCompanyResponse, CompanyRole, CompanyStatus, SuccessApiResponse } from '../../models';
import { APP_CONFIG } from '../../../../environments/environment';

// Mock APP_CONFIG
jest.mock('../../../../environments/environment', () => ({
  APP_CONFIG: {
    aws: {
      apiGateway: 'https://api.example.com'
    }
  }
}));

describe('CompanyService', () => {
  let service: CompanyService;
  let httpMock: HttpTestingController;
  let authServiceMock: jest.Mocked<AuthService>;
  let notificationServiceMock: jest.Mocked<NotificationService>;

  const mockCompanyData: CompanyWithUserContext = {
    companyId: 'company-123',
    companyName: 'Test Company',
    status: CompanyStatus.ACTIVE,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ownerEmail: 'owner@test.com',
    ownerUsername: 'testowner',
    memberCount: 1,
    members: [
      {
        email: 'owner@test.com',
        username: 'testowner',
        role: CompanyRole.OWNER,
        joinedAt: '2023-01-01T00:00:00.000Z'
      }
    ],
    userRole: CompanyRole.OWNER,
    userJoinedAt: '2024-01-01T00:00:00.000Z'
  };

  const mockSessionData = new BehaviorSubject<any>(null); // Start with null session

  beforeEach(() => {
    // Create mocks
    authServiceMock = {
      sessionData: mockSessionData
    } as any;

    notificationServiceMock = {
      showSuccess: jest.fn(),
      showError: jest.fn()
    } as any;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CompanyService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });

    service = TestBed.inject(CompanyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Handle any pending requests before verification
    const pendingRequests = httpMock.match(() => true);
    pendingRequests.forEach(req => req.flush({ timestamp: '2024-01-01T12:00:00.000Z', data: mockCompanyData }));
    
    httpMock.verify();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with null company data', () => {
      expect(service.currentCompany).toBeNull();
      expect(service.hasCompanyData).toBe(false);
    });

    it('should initialize with isFetchingCompany as false', () => {
      // Since we start with null session, no HTTP request should be triggered
      let isFetchingValue: boolean | undefined;
      
      service.isFetchingCompany$.subscribe(isFetching => {
        isFetchingValue = isFetching;
      });

      expect(isFetchingValue).toBe(false);
    });

    it('should fetch company data when session is available', () => {
      // Emit session data to trigger HTTP request
      mockSessionData.next({ userId: 'user-123' });

      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
      expect(req.request.method).toBe('GET');
      
      req.flush({
        timestamp: '2024-01-01T12:00:00.000Z',
        data: mockCompanyData
      });
    });

    it('should clear company data when session is null', () => {
      // First set some company data manually (without triggering HTTP request)
      service['company'].next(mockCompanyData);
      expect(service.currentCompany).toEqual(mockCompanyData);

      // Emit null session - this should clear the data without making HTTP request
      mockSessionData.next(null);

      expect(service.currentCompany).toBeNull();
    });
  });

  describe('get()', () => {
    it('should fetch company data successfully', (done) => {
      const mockResponse: SuccessApiResponse<CompanyWithUserContext> = {
        timestamp: '2024-01-01T12:00:00.000Z',
        data: mockCompanyData
      };

      service.get().subscribe(company => {
        expect(company).toEqual(mockCompanyData);
        expect(service.currentCompany).toEqual(mockCompanyData);
        done();
      });

      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should set isFetchingCompany to true during request', () => {
      let isFetchingValues: boolean[] = [];
      
      service.isFetchingCompany$.subscribe(isFetching => {
        isFetchingValues.push(isFetching);
      });

      service.get().subscribe();

      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
      req.flush({ timestamp: '2024-01-01T12:00:00.000Z', data: mockCompanyData });

      expect(isFetchingValues).toEqual([false, true, false]);
    });

    it('should handle HTTP errors', (done) => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      service.get().subscribe({
        error: (error) => {
          expect(error.status).toBe(500);
          expect(consoleSpy).toHaveBeenCalledWith('Error fetching company:', expect.any(Object));
          done();
        }
      });

      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      consoleSpy.mockRestore();
    });

    it('should set isFetchingCompany to false after error', (done) => {
      service.get().subscribe({
        error: () => {
          service.isFetchingCompany$.subscribe(isFetching => {
            expect(isFetching).toBe(false);
            done();
          });
        }
      });

      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
      req.flush('Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('setName()', () => {
    const updateRequest: UpdateCompanyRequest = {
      companyName: 'Updated Company Name'
    };

    beforeEach(() => {
      // Set initial company data
      service['company'].next(mockCompanyData);
    });

    it('should update company name successfully', (done) => {
      const mockResponse: SuccessApiResponse<UpdateCompanyResponse> = {
        timestamp: '2024-01-01T12:00:00.000Z',
        data: {
          message: 'Company updated successfully',
          company: {
            companyId: 'company-123',
            companyName: 'Updated Company Name',
            status: CompanyStatus.ACTIVE,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            ownerEmail: 'owner@test.com',
            ownerUsername: 'testowner',
            memberCount: 1,
            members: [
              {
                email: 'owner@test.com',
                username: 'testowner',
                role: CompanyRole.OWNER,
                joinedAt: '2023-01-01T00:00:00.000Z'
              }
            ]
          },
          updatedFields: ['companyName']
        }
      };

      service.setName(updateRequest).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(service.currentCompany?.companyName).toBe('Updated Company Name');
        expect(service.currentCompany?.userRole).toBe(CompanyRole.OWNER);
        expect(service.currentCompany?.userJoinedAt).toEqual(mockCompanyData.userJoinedAt);
        done();
      });

      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ companyName: 'Updated Company Name' });
      req.flush(mockResponse);
    });

    it('should preserve user context when updating company name', (done) => {
      const mockResponse: SuccessApiResponse<UpdateCompanyResponse> = {
        timestamp: '2024-01-01T12:00:00.000Z',
        data: {
          message: 'Company updated successfully',
          company: {
            companyId: 'company-123',
            companyName: 'Updated Company Name',
            status: CompanyStatus.ACTIVE,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            ownerEmail: 'owner@test.com',
            ownerUsername: 'testowner',
            memberCount: 1,
            members: [
              {
                email: 'owner@test.com',
                username: 'testowner',
                role: CompanyRole.OWNER,
                joinedAt: '2023-01-01T00:00:00.000Z'
              }
            ]
          },
          updatedFields: ['companyName']
        }
      };

      service.setName(updateRequest).subscribe(() => {
        const currentCompany = service.currentCompany;
        expect(currentCompany?.userRole).toBe(CompanyRole.OWNER);
        expect(currentCompany?.userJoinedAt).toEqual(mockCompanyData.userJoinedAt);
        done();
      });

      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
      req.flush(mockResponse);
    });

    it('should handle update errors', (done) => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      service.setName(updateRequest).subscribe({
        error: (error) => {
          expect(error.status).toBe(400);
          expect(consoleSpy).toHaveBeenCalledWith('Error updating company name:', expect.any(Object));
          done();
        }
      });

      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });

      consoleSpy.mockRestore();
    });

    it('should not update company if no current company exists', (done) => {
      service.clear();

      const mockResponse: SuccessApiResponse<UpdateCompanyResponse> = {
        timestamp: '2024-01-01T12:00:00.000Z',
        data: {
          message: 'Company updated successfully',
          company: {
            companyId: 'company-123',
            companyName: 'Updated Company Name',
            status: CompanyStatus.ACTIVE,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            ownerEmail: 'owner@test.com',
            ownerUsername: 'testowner',
            memberCount: 1,
            members: [
              {
                email: 'owner@test.com',
                username: 'testowner',
                role: CompanyRole.OWNER,
                joinedAt: '2023-01-01T00:00:00.000Z'
              }
            ]
          },
          updatedFields: ['companyName']
        }
      };

      service.setName(updateRequest).subscribe(() => {
        expect(service.currentCompany).toBeNull();
        done();
      });

      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
      req.flush(mockResponse);
    });
  });

  describe('isOwner getter', () => {
    it('should return true when user role is OWNER', () => {
      service['company'].next({
        ...mockCompanyData,
        userRole: CompanyRole.OWNER
      });

      expect(service.isOwner).toBe(true);
    });

    it('should return false when user role is not OWNER', () => {
      service['company'].next({
        ...mockCompanyData,
        userRole: CompanyRole.MEMBER
      });

      expect(service.isOwner).toBe(false);
    });

    it('should return false when no company data exists', () => {
      service.clear();
      expect(service.isOwner).toBe(false);
    });
  });

  describe('hasCompanyData getter', () => {
    it('should return true when company data exists', () => {
      service['company'].next(mockCompanyData);
      expect(service.hasCompanyData).toBe(true);
    });

    it('should return false when no company data exists', () => {
      service.clear();
      expect(service.hasCompanyData).toBe(false);
    });
  });

  describe('clear()', () => {
    it('should clear company data', () => {
      service['company'].next(mockCompanyData);
      expect(service.currentCompany).toEqual(mockCompanyData);

      service.clear();
      expect(service.currentCompany).toBeNull();
    });

    it('should emit null value to company$ observable', (done) => {
      service['company'].next(mockCompanyData);
      
      service.clear();
      
      service.company$.subscribe(company => {
        expect(company).toBeNull();
        done();
      });
    });
  });

  describe('Observables', () => {
    it('should emit company data through company$ observable', (done) => {
      service.company$.subscribe(company => {
        if (company) {
          expect(company).toEqual(mockCompanyData);
          done();
        }
      });

      service['company'].next(mockCompanyData);
    });

    it('should emit fetching state through isFetchingCompany$ observable', (done) => {
      const states: boolean[] = [];
      
      service.isFetchingCompany$.subscribe(isFetching => {
        states.push(isFetching);
        
        if (states.length === 3) {
          expect(states).toEqual([false, true, false]);
          done();
        }
      });

      service.get().subscribe();
      
      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
      req.flush({ timestamp: '2024-01-01T12:00:00.000Z', data: mockCompanyData });
    });
  });

  describe('Session Management', () => {
    it('should fetch company data when session becomes available', () => {
      // Clear any existing requests
      httpMock.match(() => true).forEach(req => req.flush(null));
      
      // Emit session data
      mockSessionData.next({ userId: 'user-123' });

      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
      expect(req.request.method).toBe('GET');
      req.flush({ data: mockCompanyData, success: true });
    });

    it('should clear company data when session becomes null', () => {
      service['company'].next(mockCompanyData);
      expect(service.currentCompany).toEqual(mockCompanyData);

      mockSessionData.next(null);

      expect(service.currentCompany).toBeNull();
    });
  });
});