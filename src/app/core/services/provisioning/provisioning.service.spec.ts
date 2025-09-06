import { BehaviorSubject } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,
         HttpTestingController } from '@angular/common/http/testing';

import { ProvisioningService } from './provisioning.service';
import { AuthService } from '@services/auth/auth.service';
import { APP_CONFIG } from '@env/environment';


jest.mock('@env/environment', () => ({
  APP_CONFIG: {
    aws: {
      apiGateway: 'https://api.example.com'
    }
  }
}));

describe('ProvisioningService', () => {
  
  let service: ProvisioningService;
  let httpMock: HttpTestingController;
  let authService: jest.Mocked<Pick<AuthService, 'sessionData' | 'idToken'>>;
  let sessionSignal: BehaviorSubject<any>;

  const mockIdToken = 'id-token-abc' as const;
  const mockSession = {
    tokens: {
      idToken: { toString: () => mockIdToken }
    }
  } as const;
  const mockApiResponse = { foo: 'bar' } as const;

  beforeEach(async () => {
    sessionSignal = new BehaviorSubject<any>(mockSession);
    authService = {
      sessionData: sessionSignal,
      idToken: jest.fn(() => mockIdToken)
    } as any;
    await TestBed.configureTestingModule({
      providers:
      [
        ProvisioningService,
        { provide: AuthService, useValue: authService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ProvisioningService);
    httpMock = TestBed.inject(HttpTestingController);
    jest.clearAllMocks();
  });

  afterEach(() => {
    httpMock.verify();
    jest.resetAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a provisioning claim and map idToken', (done) => {
    const expectedUrl = `${APP_CONFIG.aws.apiGateway}/provisioning-claims/`;

    service.createClaim().subscribe(result => {
      expect((result as any).foo).toBe('bar');
      expect((result as any).idToken).toBe(mockIdToken);
      expect(authService.idToken).toHaveBeenCalled();
      done();
    });

    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    
    req.flush(mockApiResponse);
  });

  it('should handle null session data gracefully', (done) => {
    authService.idToken.mockReturnValue('');
    sessionSignal.next(null);

    service.createClaim().subscribe(result => {
      expect((result as any).idToken).toBe('');
      done();
    });

    const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/provisioning-claims/`);
    req.flush(mockApiResponse);
  });

  it('should handle HTTP errors', (done) => {
    service.createClaim().subscribe({
      next: () => done.fail('Should error'),
      error: (err) => {
        expect(err.status).toBe(500);
        done();
      }
    });

    const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/provisioning-claims/`);
    req.flush('fail', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should call idToken method once per request', (done) => {
    service.createClaim().subscribe(() => {
      expect(authService.idToken).toHaveBeenCalledTimes(1);
      done();
    });
    
    const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/provisioning-claims/`);
    req.flush(mockApiResponse);
  });

  it('should handle empty API response', (done) => {
    service.createClaim().subscribe(result => {
      expect(result).toMatchObject({ idToken: mockIdToken });
      done();
    });
    const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/provisioning-claims/`);
    req.flush({});
  });

});