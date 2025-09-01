import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,
         HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse,
         HttpResponse } from '@angular/common/http';

import { DeviceRegistryService } from './device-registry.service';
import { AuthService } from '@services/auth/auth.service';
import { APP_CONFIG } from '@env/environment';
import { Sensor,
         SuccessApiResponse,
         ApiResult } from '@models';


describe('DeviceRegistryService', () => {
  let service: DeviceRegistryService;
  let httpMock: HttpTestingController;
  let authService: { company: jest.Mock };

  const mockCompany = 'test-company';
  const thingName = 'sensor-001';
  const apiUrl = APP_CONFIG.aws.apiGateway;

  const mockSensor: Sensor = {
    thingName,
    company: mockCompany
  };

  const mockSuccessResponse: SuccessApiResponse<Sensor> = {
    data: mockSensor,
    timestamp: new Date().toISOString()
  };

  beforeEach(() => {
    authService = { company: jest.fn(() => mockCompany) };
    TestBed.configureTestingModule({
      providers: [
        DeviceRegistryService,
        { provide: AuthService, useValue: authService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(DeviceRegistryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('checkSensorExists', () => {
    it('should return sensor data when device exists (200)', (done) => {
      service.checkSensorExists(thingName).subscribe({
        next: (result) => {
          expect(result).toEqual(mockSensor);
          done();
        },
        error: done.fail
      });
      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      expect(req.request.method).toBe('GET');
      req.event(new HttpResponse<ApiResult<Sensor>>({ body: mockSuccessResponse, status: 200 }));
    });

    it('should return null when device does not exist (404)', (done) => {
      service.checkSensorExists(thingName).subscribe({
        next: (result) => {
          expect(result).toBeNull();
          done();
        },
        error: done.fail
      });
      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should throw error for non-404 HTTP errors', (done) => {
      service.checkSensorExists(thingName).subscribe({
        next: () => done.fail('Should have thrown'),
        error: (err: HttpErrorResponse) => {
          expect(err.status).toBe(500);
          done();
        }
      });
      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should log company match/mismatch', (done) => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      // Company matches
      service.checkSensorExists(thingName).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: device associated company matches with user's organization`
          );
          // Company mismatch
          logSpy.mockClear();
          const mismatchSensor: Sensor = { ...mockSensor, company: 'other-company' };
          const mismatchResponse: SuccessApiResponse<Sensor> = {
            data: mismatchSensor,
            timestamp: new Date().toISOString()
          };
          service.checkSensorExists(thingName).subscribe({
            next: () => {
              expect(logSpy).toHaveBeenCalledWith(
                `[DeviceRegistryService]: device associated company does not match with user's organization`
              );
              logSpy.mockRestore();
              done();
            },
            error: done.fail
          });
          const req2 = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
          req2.event(new HttpResponse<ApiResult<Sensor>>({ body: mismatchResponse, status: 200 }));
        },
        error: done.fail
      });
      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      req.event(new HttpResponse<ApiResult<Sensor>>({ body: mockSuccessResponse, status: 200 }));
    });

    it('should log not found for 404', (done) => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      service.checkSensorExists(thingName).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: device with name ${thingName} not found (404)`
          );
          logSpy.mockRestore();
          done();
        },
        error: done.fail
      });
      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should log error for non-404 errors', (done) => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      service.checkSensorExists(thingName).subscribe({
        next: () => done.fail('Should have thrown'),
        error: () => {
          expect(errorSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: error checking device existence:`,
            expect.anything()
          );
          errorSpy.mockRestore();
          done();
        }
      });
      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('deleteSensor', () => {
    it('should return true when device is successfully deleted (200)', (done) => {
      const mockDeleteResponse: SuccessApiResponse<any> = {
        data: {
          message: `Thing '${thingName}' has been successfully deleted`,
          thingName,
          company: mockCompany
        },
        timestamp: new Date().toISOString()
      };

      service.deleteSensor(thingName).subscribe({
        next: (result) => {
          expect(result).toBe(true);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      expect(req.request.method).toBe('DELETE');
      req.event(new HttpResponse<ApiResult<any>>({ body: mockDeleteResponse, status: 200 }));
    });

    it('should return false when device does not exist (404)', (done) => {
      service.deleteSensor(thingName).subscribe({
        next: (result) => {
          expect(result).toBe(false);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      expect(req.request.method).toBe('DELETE');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should return false for non-404 HTTP errors', (done) => {
      service.deleteSensor(thingName).subscribe({
        next: (result) => {
          expect(result).toBe(false);
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      expect(req.request.method).toBe('DELETE');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should log success when device is deleted', (done) => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockDeleteResponse: SuccessApiResponse<any> = {
        data: {
          message: `Thing '${thingName}' has been successfully deleted`,
          thingName,
          company: mockCompany
        },
        timestamp: new Date().toISOString()
      };

      service.deleteSensor(thingName).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: deleting device with name ${thingName} (company: ${mockCompany}) from the registry...`
          );
          expect(logSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: deleted device with name ${thingName}`
          );
          logSpy.mockRestore();
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      req.event(new HttpResponse<ApiResult<any>>({ body: mockDeleteResponse, status: 200 }));
    });

    it('should log not found for 404', (done) => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      service.deleteSensor(thingName).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: device with name ${thingName} not found (404)`
          );
          logSpy.mockRestore();
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should log error for non-404 errors', (done) => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      service.deleteSensor(thingName).subscribe({
        next: () => {
          expect(errorSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: error deleting device:`,
            expect.anything()
          );
          errorSpy.mockRestore();
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should call authService.company() to get user company', (done) => {
      const mockDeleteResponse: SuccessApiResponse<any> = {
        data: {
          message: `Thing '${thingName}' has been successfully deleted`,
          thingName,
          company: mockCompany
        },
        timestamp: new Date().toISOString()
      };

      service.deleteSensor(thingName).subscribe({
        next: () => {
          expect(authService.company).toHaveBeenCalled();
          done();
        },
        error: done.fail
      });

      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      req.event(new HttpResponse<ApiResult<any>>({ body: mockDeleteResponse, status: 200 }));
    });
  });
});