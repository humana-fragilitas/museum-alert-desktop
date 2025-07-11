import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject } from 'rxjs';

import { NotificationService } from './notification.service';
import { DeviceService } from '../device/device.service';
import { ErrorService } from '../error/error.service';
import { DeviceErrorType, ErrorType, AppErrorType } from '../../../../../app/shared/models';
import { AuthenticationExpiredError } from '../../interceptors/auth-token.interceptor';

// Mock types
type Nullable<T> = T | null;

describe('NotificationService', () => {
  let service: NotificationService;
  let mockMatSnackBar: jest.Mocked<MatSnackBar>;
  let mockDeviceService: jest.Mocked<DeviceService>;
  let mockErrorService: jest.Mocked<ErrorService>;
  let deviceErrorSubject: Subject<Nullable<DeviceErrorType>>;

  beforeEach(() => {
    // Create mock subjects
    deviceErrorSubject = new Subject<Nullable<DeviceErrorType>>();

    // Create mocks
    mockMatSnackBar = {
      open: jest.fn().mockReturnValue({
        dismiss: jest.fn(),
        onAction: jest.fn().mockReturnValue(of({}))
      })
    } as any;

    mockDeviceService = {
      error$: deviceErrorSubject.asObservable()
    } as any;

    mockErrorService = {
      translate: jest.fn().mockReturnValue('Translated error message')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: MatSnackBar, useValue: mockMatSnackBar },
        { provide: DeviceService, useValue: mockDeviceService },
        { provide: ErrorService, useValue: mockErrorService }
      ]
    });

    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    deviceErrorSubject.complete();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should subscribe to device error observable on construction', () => {
      // Verify subscription by emitting a value
      const spy = jest.spyOn(service, 'onError');
      
      deviceErrorSubject.next(DeviceErrorType.INVALID_WIFI_CREDENTIALS);
      
      expect(spy).toHaveBeenCalledWith(
        ErrorType.DEVICE_ERROR,
        DeviceErrorType.INVALID_WIFI_CREDENTIALS
      );
    });
  });

  describe('onError Method', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Early Returns', () => {
      it('should return early when target is null', () => {
        service.onError(ErrorType.DEVICE_ERROR, null);

        expect(mockErrorService.translate).not.toHaveBeenCalled();
        expect(mockMatSnackBar.open).not.toHaveBeenCalled();
      });

      it('should return early when error is AuthenticationExpiredError', () => {
        const baseHttpError = new HttpErrorResponse({
          status: 401,
          statusText: 'Unauthorized'
        });
        const authError = new AuthenticationExpiredError(baseHttpError);
        
        service.onError(
          ErrorType.APP_ERROR,
          AppErrorType.UNAUTHORIZED,
          authError as any
        );

        expect(mockErrorService.translate).not.toHaveBeenCalled();
        expect(mockMatSnackBar.open).not.toHaveBeenCalled();
      });

      it('should return early when target is null even with other error types', () => {
        const httpError = new HttpErrorResponse({ status: 500 });
        
        service.onError(ErrorType.APP_ERROR, null, httpError);

        expect(mockErrorService.translate).not.toHaveBeenCalled();
        expect(mockMatSnackBar.open).not.toHaveBeenCalled();
      });
    });

    describe('Device Error Processing', () => {
      it('should process device error correctly', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        service.onError(
          ErrorType.DEVICE_ERROR,
          DeviceErrorType.FAILED_WIFI_CONNECTION_ATTEMPT
        );

        expect(consoleSpy).toHaveBeenCalledWith(
          'NotificationService: received device error: ',
          DeviceErrorType.FAILED_WIFI_CONNECTION_ATTEMPT
        );
        expect(mockErrorService.translate).toHaveBeenCalledWith(
          ErrorType.DEVICE_ERROR,
          DeviceErrorType.FAILED_WIFI_CONNECTION_ATTEMPT
        );
        expect(mockMatSnackBar.open).toHaveBeenCalledWith(
          'Translated error message',
          'Dismiss'
        );

        consoleSpy.mockRestore();
      });

      it('should handle all device error types', () => {
        const deviceErrorTypes = [
          DeviceErrorType.CIPHERING_INITIALIZATION_ERROR,
          DeviceErrorType.INVALID_WIFI_CREDENTIALS,
          DeviceErrorType.FAILED_WIFI_CONNECTION_ATTEMPT,
          DeviceErrorType.INVALID_DEVICE_PROVISIONING_SETTINGS,
          DeviceErrorType.INVALID_DEVICE_COMMAND,
          DeviceErrorType.FAILED_PROVISIONING_SETTINGS_STORAGE,
          DeviceErrorType.FAILED_DEVICE_PROVISIONING_ATTEMPT,
          DeviceErrorType.FAILED_MQTT_BROKER_CONNECTION,
          DeviceErrorType.FAILED_DEVICE_CONFIGURATION_RETRIEVAL,
          DeviceErrorType.FAILED_SENSOR_DETECTION_REPORT
        ];

        deviceErrorTypes.forEach(errorType => {
          jest.clearAllMocks();
          
          service.onError(ErrorType.DEVICE_ERROR, errorType);
          
          expect(mockErrorService.translate).toHaveBeenCalledWith(
            ErrorType.DEVICE_ERROR,
            errorType
          );
          expect(mockMatSnackBar.open).toHaveBeenCalledWith(
            'Translated error message',
            'Dismiss'
          );
        });
      });
    });

    describe('App Error Processing', () => {
      it('should process app error correctly', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        service.onError(
          ErrorType.APP_ERROR,
          AppErrorType.FAILED_PROVISIONING_CLAIM_CREATION
        );

        expect(consoleSpy).toHaveBeenCalledWith(
          'NotificationService: received application error: ',
          AppErrorType.FAILED_PROVISIONING_CLAIM_CREATION
        );
        expect(mockErrorService.translate).toHaveBeenCalledWith(
          ErrorType.APP_ERROR,
          AppErrorType.FAILED_PROVISIONING_CLAIM_CREATION
        );
        expect(mockMatSnackBar.open).toHaveBeenCalledWith(
          'Translated error message',
          'Dismiss'
        );

        consoleSpy.mockRestore();
      });

      it('should handle all app error types', () => {
        const appErrorTypes = [
          AppErrorType.UNAUTHORIZED,
          AppErrorType.FAILED_PROVISIONING_CLAIM_CREATION,
          AppErrorType.FAILED_EXISTING_THING_CHECK,
          AppErrorType.THING_ALREADY_EXISTS,
          AppErrorType.THING_ALREADY_EXISTS_IN_OTHER_ORGANIZATION,
          AppErrorType.GENERIC_ERROR,
          AppErrorType.FAILED_COMPANY_UPDATE,
          AppErrorType.FAILED_COMPANY_RETRIEVAL
        ];

        appErrorTypes.forEach(errorType => {
          jest.clearAllMocks();
          
          service.onError(ErrorType.APP_ERROR, errorType);
          
          expect(mockErrorService.translate).toHaveBeenCalledWith(
            ErrorType.APP_ERROR,
            errorType
          );
          expect(mockMatSnackBar.open).toHaveBeenCalledWith(
            'Translated error message',
            'Dismiss'
          );
        });
      });

      it('should process app error with HttpErrorResponse', () => {
        const httpError = new HttpErrorResponse({
          status: 400,
          statusText: 'Bad Request'
        });
        
        service.onError(
          ErrorType.APP_ERROR,
          AppErrorType.GENERIC_ERROR,
          httpError
        );

        expect(mockErrorService.translate).toHaveBeenCalledWith(
          ErrorType.APP_ERROR,
          AppErrorType.GENERIC_ERROR
        );
        expect(mockMatSnackBar.open).toHaveBeenCalledWith(
          'Translated error message',
          'Dismiss'
        );
      });
    });

    describe('Console Logging', () => {
      let consoleSpy: jest.SpyInstance;

      beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      });

      afterEach(() => {
        consoleSpy.mockRestore();
      });

      it('should log device error with correct format', () => {
        service.onError(ErrorType.DEVICE_ERROR, DeviceErrorType.INVALID_WIFI_CREDENTIALS);

        expect(consoleSpy).toHaveBeenCalledWith(
          'NotificationService: received device error: ',
          DeviceErrorType.INVALID_WIFI_CREDENTIALS
        );
      });

      it('should log app error with correct format', () => {
        service.onError(ErrorType.APP_ERROR, AppErrorType.UNAUTHORIZED);

        expect(consoleSpy).toHaveBeenCalledWith(
          'NotificationService: received application error: ',
          AppErrorType.UNAUTHORIZED
        );
      });

      it('should log unknown error type as "unknown"', () => {
        // This tests the fallback case in the ternary operator
        service.onError(999 as any, DeviceErrorType.INVALID_WIFI_CREDENTIALS);

        expect(consoleSpy).toHaveBeenCalledWith(
          'NotificationService: received unknown error: ',
          DeviceErrorType.INVALID_WIFI_CREDENTIALS
        );
      });
    });
  });

  describe('Device Service Integration', () => {
    it('should handle device service error emissions', () => {
      const onErrorSpy = jest.spyOn(service, 'onError');
      
      deviceErrorSubject.next(DeviceErrorType.FAILED_MQTT_BROKER_CONNECTION);
      
      expect(onErrorSpy).toHaveBeenCalledWith(
        ErrorType.DEVICE_ERROR,
        DeviceErrorType.FAILED_MQTT_BROKER_CONNECTION
      );
    });

    it('should handle null device error emissions', () => {
      const onErrorSpy = jest.spyOn(service, 'onError');
      
      deviceErrorSubject.next(null);
      
      expect(onErrorSpy).toHaveBeenCalledWith(ErrorType.DEVICE_ERROR, null);
      // Verify that snackbar is not opened for null errors
      expect(mockMatSnackBar.open).not.toHaveBeenCalled();
    });

    it('should handle multiple device error emissions', () => {
      const onErrorSpy = jest.spyOn(service, 'onError');
      
      deviceErrorSubject.next(DeviceErrorType.INVALID_WIFI_CREDENTIALS);
      deviceErrorSubject.next(DeviceErrorType.FAILED_WIFI_CONNECTION_ATTEMPT);
      deviceErrorSubject.next(DeviceErrorType.FAILED_MQTT_BROKER_CONNECTION);
      
      expect(onErrorSpy).toHaveBeenCalledTimes(3);
      expect(mockMatSnackBar.open).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Service Integration', () => {
    it('should call error service translate with correct parameters', () => {
      service.onError(ErrorType.DEVICE_ERROR, DeviceErrorType.INVALID_WIFI_CREDENTIALS);

      expect(mockErrorService.translate).toHaveBeenCalledWith(
        ErrorType.DEVICE_ERROR,
        DeviceErrorType.INVALID_WIFI_CREDENTIALS
      );
    });

    it('should use translated message in snackbar', () => {
      const customTranslation = 'Custom error message';
      mockErrorService.translate.mockReturnValue(customTranslation);

      service.onError(ErrorType.APP_ERROR, AppErrorType.GENERIC_ERROR);

      expect(mockMatSnackBar.open).toHaveBeenCalledWith(
        customTranslation,
        'Dismiss'
      );
    });
  });

  describe('Snackbar Integration', () => {
    it('should open snackbar with dismiss action', () => {
      service.onError(ErrorType.DEVICE_ERROR, DeviceErrorType.INVALID_WIFI_CREDENTIALS);

      expect(mockMatSnackBar.open).toHaveBeenCalledWith(
        'Translated error message',
        'Dismiss'
      );
    });

    it('should not open snackbar for filtered errors', () => {
      service.onError(ErrorType.DEVICE_ERROR, null);

      expect(mockMatSnackBar.open).not.toHaveBeenCalled();
    });
  });
});