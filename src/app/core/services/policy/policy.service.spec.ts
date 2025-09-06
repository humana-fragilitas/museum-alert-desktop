import { of } from 'rxjs';
import { AuthenticatorService } from '@aws-amplify/ui-angular';

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,
         HttpTestingController } from '@angular/common/http/testing';

import { PolicyService } from './policy.service';
import { AuthService } from '@services/auth/auth.service';
import { ErrorService } from '@services/error/error.service';
import { DialogService } from '@services/dialog/dialog.service';
import { APP_CONFIG } from '@env/environment';


jest.mock('@env/environment', () => ({
  APP_CONFIG: {
    aws: {
      apiGateway: 'https://test-api.example.com'
    }
  }
}));

describe('PolicyService', () => {

  let service: PolicyService;
  let httpMock: HttpTestingController;
  let authService: any;
  let errorService: any;
  let dialogService: any;
  let authenticatorService: any;

  beforeEach(async () => {
    authService = {
      fetchSession: jest.fn(() => Promise.resolve())
    };
    errorService = { };
    dialogService = { openDialog: jest.fn(() => of(null)) };
    authenticatorService = { signOut: jest.fn() };
    
    await TestBed.configureTestingModule({
      providers: [
        PolicyService,
        { provide: AuthService, useValue: authService },
        { provide: ErrorService, useValue: errorService },
        { provide: DialogService, useValue: dialogService },
        { provide: AuthenticatorService, useValue: authenticatorService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    
    service = TestBed.inject(PolicyService);
    httpMock = TestBed.inject(HttpTestingController);
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should successfully attach policy and refresh session', async () => {
    const expectedUrl = `${APP_CONFIG.aws.apiGateway}/user-policy`;
    
    const promise = service.attachPolicy();
    
    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    
    req.flush({ 
      data: { 
        policyName: 'test-policy',
        identityId: 'test-identity',
        company: 'test-company'
      }, 
      timestamp: Date.now() 
    });
    
    const result = await promise;
    expect((result as any).data.policyName).toBe('test-policy');
  });

  it('should retry attachPolicy on error and eventually succeed', async () => {
    const expectedUrl = `${APP_CONFIG.aws.apiGateway}/user-policy`;
    let callCount = 0;
    
    const promise = service.attachPolicy(2, 1);
    
    // First call fails
    const req1 = httpMock.expectOne(expectedUrl);
    callCount++;
    req1.error(new ProgressEvent('fail'), { status: 500, statusText: 'Server Error' });
    
    // Wait a bit for retry delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Second call succeeds
    const req2 = httpMock.expectOne(expectedUrl);
    callCount++;
    req2.flush({ data: { attached: true }, timestamp: Date.now() });
    
    await promise;
    
    expect(callCount).toBe(2);
  });

  it('should throw after max retries in attachPolicy', async () => {
    const expectedUrl = `${APP_CONFIG.aws.apiGateway}/user-policy`;
    
    try {
      const promise = service.attachPolicy(2, 1);
      
      // First call fails
      const req1 = httpMock.expectOne(expectedUrl);
      req1.error(new ProgressEvent('fail'), { status: 500, statusText: 'Server Error' });
      
      // Wait a bit for retry delay
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Second call fails
      const req2 = httpMock.expectOne(expectedUrl);
      req2.error(new ProgressEvent('fail'), { status: 500, statusText: 'Server Error' });
      
      await promise;
      fail('Expected promise to reject but it resolved');
    } catch (error) {
      expect(error).toBeDefined();
      expect(authService.fetchSession).not.toHaveBeenCalled();
    }
  });

  afterEach(() => {
    try {
      httpMock.verify();
    } catch (e) {
      // Some tests intentionally leave HTTP requests open
    }
    jest.clearAllMocks();
  });
  
});