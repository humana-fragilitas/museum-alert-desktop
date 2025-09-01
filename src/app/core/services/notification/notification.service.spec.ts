import { TranslateService,
         TranslateStore } from '@ngx-translate/core';

import { TestBed,
         fakeAsync,
         tick } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { signal,
         ApplicationRef } from '@angular/core';

import { NotificationService } from './notification.service';
import { DeviceService } from '@services/device/device.service';
import { ErrorService } from '@services/error/error.service';
import { DeviceErrorType,
         DeviceMessageType } from '@shared-with-electron';


describe('NotificationService', () => {
  let service: NotificationService;
  let snackBar: jest.Mocked<MatSnackBar>;
  let deviceService: any;
  let translate: any;
  let errorService: any;
  let errorSignal: any;
  let applicationRef: ApplicationRef;

  beforeEach(() => {
    errorSignal = signal(null);
    snackBar = { open: jest.fn() } as any;
    deviceService = { error: errorSignal };
    translate = { instant: jest.fn((x) => x) };
    errorService = { toTranslationTag: jest.fn((type) => `ERRORS.DEVICE.${type}`) };
    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: MatSnackBar, useValue: snackBar },
        { provide: DeviceService, useValue: deviceService },
        { provide: TranslateService, useValue: translate },
        { provide: TranslateStore, useValue: {} },
        { provide: ErrorService, useValue: errorService }
      ]
    });
    service = TestBed.inject(NotificationService);
    applicationRef = TestBed.inject(ApplicationRef);
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should subscribe to device error signal and call onError for DeviceMessageType.ERROR', fakeAsync(() => {
    const spy = jest.spyOn(service, 'onError');
    errorSignal.set({ type: DeviceMessageType.ERROR, data: { error: DeviceErrorType.INVALID_WIFI_CREDENTIALS } });
    applicationRef.tick(); // Trigger effects
    tick(); // Allow effects to run
    expect(spy).toHaveBeenCalledWith(DeviceErrorType.INVALID_WIFI_CREDENTIALS);
  }));

  it('should not call onError for non-error device messages', fakeAsync(() => {
    const spy = jest.spyOn(service, 'onError');
    errorSignal.set({ type: DeviceMessageType.APP_STATE, data: {} });
    applicationRef.tick(); // Trigger effects
    tick(); // Allow effects to run
    expect(spy).not.toHaveBeenCalled();
  }));

  it('should call snackbar with translated error and dismiss action', () => {
    const errorType = DeviceErrorType.FAILED_WIFI_CONNECTION_ATTEMPT;
    errorService.toTranslationTag.mockReturnValue('ERRORS.DEVICE.FAILED_WIFI_CONNECTION_ATTEMPT');
    translate.instant.mockImplementation((x: string) => x === 'ERRORS.DEVICE.FAILED_WIFI_CONNECTION_ATTEMPT' ? 'Translated error' : 'Dismiss');
    service.onError(errorType);
    expect(snackBar.open).toHaveBeenCalledWith('Translated error', 'Dismiss');
  });

  it('should log error handling', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    service.onError(DeviceErrorType.FAILED_MQTT_BROKER_CONNECTION);
    expect(logSpy).toHaveBeenCalledWith('[NotificationService]: handling device error:', DeviceErrorType.FAILED_MQTT_BROKER_CONNECTION);
    logSpy.mockRestore();
  });

  it('should handle null error type by calling snackBar with null error translation', () => {
    service.onError(null);
    expect(snackBar.open).toHaveBeenCalledWith('ERRORS.DEVICE.null', 'COMMON.ACTIONS.DISMISS');
  });
});