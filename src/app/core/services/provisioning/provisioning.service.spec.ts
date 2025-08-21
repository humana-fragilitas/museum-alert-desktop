import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';

import { ProvisioningService } from './provisioning.service';
import { AuthService } from '../auth/auth.service';
import { DeviceService } from '../device/device.service';
import { APP_CONFIG } from '../../../../environments/environment';

// Mock the environment config
jest.mock('../../../../environments/environment', () => ({
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
  let deviceService: jest.Mocked<Pick<DeviceService, 'generateCid'>>;
  let sessionSignal: BehaviorSubject<any>;

  // Mock data
  const mockCid = 'cid-123' as const;
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
    deviceService = {
      generateCid: jest.fn(() => mockCid)
    } as any;
    await TestBed.configureTestingModule({
      providers:
      [
        ProvisioningService,
        { provide: AuthService, useValue: authService },
        { provide: DeviceService, useValue: deviceService },
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

  it('should create a provisioning claim and map cid/idToken', (done) => {
    // Arrange
    const expectedUrl = `${APP_CONFIG.aws.apiGateway}/provisioning-claims/`;

    // Act
    service.createClaim().subscribe(result => {
      // Assert
      expect((result as any).foo).toBe('bar');
      expect((result as any).cid).toBe(mockCid);
      expect((result as any).idToken).toBe(mockIdToken);
      expect(deviceService.generateCid).toHaveBeenCalled();
      expect(authService.idToken).toHaveBeenCalled();
      done();
    });

    // Assert HTTP request
    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    
    // Respond with mock data
    req.flush(mockApiResponse);
  });

  it('should handle null session data gracefully', (done) => {
    // Arrange
    authService.idToken.mockReturnValue(''); // Return empty string to match type
    sessionSignal.next(null);

    // Act
    service.createClaim().subscribe(result => {
      // Assert
      expect((result as any).cid).toBe(mockCid);
      expect((result as any).idToken).toBe(''); // Expect empty string
      done();
    });

    const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/provisioning-claims/`);
    req.flush(mockApiResponse);
  });

  it('should handle HTTP errors', (done) => {
    // Act
    service.createClaim().subscribe({
      next: () => done.fail('Should error'),
      error: (err) => {
        // Assert
        expect(err.status).toBe(500);
        done();
      }
    });

    const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/provisioning-claims/`);
    req.flush('fail', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should call generateCid once per request', () => {
    // Act
    const sub = service.createClaim().subscribe();
    
    // Assert
    expect(deviceService.generateCid).toHaveBeenCalledTimes(1);
    
    // Clean up
    const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/provisioning-claims/`);
    req.flush(mockApiResponse);
    sub.unsubscribe();
  });

  it('should handle empty API response', (done) => {
    service.createClaim().subscribe(result => {
      expect(result).toMatchObject({ cid: mockCid, idToken: mockIdToken });
      done();
    });
    const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/provisioning-claims/`);
    req.flush({});
  });
});