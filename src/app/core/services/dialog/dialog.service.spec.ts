import { of } from 'rxjs';

import { TestBed } from '@angular/core/testing';
import { MatDialog,
         MatDialogRef,
         MatDialogConfig } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';

import { DialogService } from './dialog.service';
import { DialogComponent } from '@shared/components/dialog/dialog.component';
import { DialogPayload,
         DialogResult,
         DialogType } from '@models';
import { AuthenticationExpiredError } from '@interceptors/auth-token.interceptor';
import { USBCommandTimeoutException } from '@services/device/device.service';


describe('DialogService', () => {
  let service: DialogService;
  let mockDialog: jest.Mocked<MatDialog>;
  let mockDialogRef: jest.Mocked<MatDialogRef<DialogComponent>>;

  beforeEach(() => {
    mockDialogRef = {
      afterClosed: jest.fn(),
      close: jest.fn(),
      componentInstance: {},
    } as any;
    mockDialog = {
      open: jest.fn().mockReturnValue(mockDialogRef),
    } as any;
    TestBed.configureTestingModule({
      providers: [
        DialogService,
        { provide: MatDialog, useValue: mockDialog },
      ],
    });
    service = TestBed.inject(DialogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should open dialog with merged config and return afterClosed observable', (done) => {
    const payload: DialogPayload = {
      type: DialogType.INFO,
      title: 'Test',
      message: 'Test message',
    };
    const customConfig: MatDialogConfig = { width: '600px', disableClose: false };
    const mockResult: DialogResult = { confirmed: true };
    mockDialogRef.afterClosed.mockReturnValue(of(mockResult));

    service.openDialog(payload, customConfig).subscribe(result => {
      expect(result).toEqual(mockResult);
      done();
    });

    expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, expect.objectContaining({
      width: '600px',
      disableClose: false,
      data: payload,
      autoFocus: true,
      restoreFocus: true,
    }));
  });

  it('should use default config if none provided', () => {
    const payload: DialogPayload = {
      type: DialogType.INFO,
      title: 'Default',
      message: 'Default config',
    };
    mockDialogRef.afterClosed.mockReturnValue(of(null));
    service.openDialog(payload);
    expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, expect.objectContaining({
      width: '400px',
      disableClose: true,
      autoFocus: true,
      restoreFocus: true,
      data: payload,
    }));
  });

  it('should override type to ERROR if exception is present', () => {
    const payload: DialogPayload = {
      type: DialogType.INFO,
      title: 'Error',
      message: 'Should become error',
      exception: new USBCommandTimeoutException('Timeout'),
    };
    mockDialogRef.afterClosed.mockReturnValue(of(null));
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    service.openDialog(payload).subscribe();
    expect(payload.type).toBe(DialogType.ERROR);
    expect(logSpy).toHaveBeenCalledWith(
      `[DialogService]: got and exception; overriding modal type to 'Error' by default`
    );
    logSpy.mockRestore();
  });

  it('should skip dialog and return null if exception is AuthenticationExpiredError', (done) => {
    const dummyHttpError = new HttpErrorResponse({ error: 'Session expired', status: 401 });
    const payload: DialogPayload = {
      type: DialogType.INFO,
      title: 'Auth Expired',
      message: 'Should skip',
      exception: new AuthenticationExpiredError(dummyHttpError),
    };
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    service.openDialog(payload).subscribe(result => {
      expect(result).toBeNull();
      expect(logSpy).toHaveBeenCalledWith(
        `[DialogService]: skipping error modal: error is of type 'AuthenticationExpiredError':`,
        payload.exception
      );
      logSpy.mockRestore();
      done();
    });
    expect(mockDialog.open).not.toHaveBeenCalled();
  });

  it('should pass through afterClosed observable result', (done) => {
    const payload: DialogPayload = {
      type: DialogType.SUCCESS,
      title: 'Success',
      message: 'Operation succeeded',
    };
    const mockResult: DialogResult = { confirmed: true, data: { foo: 'bar' } };
    mockDialogRef.afterClosed.mockReturnValue(of(mockResult));
    service.openDialog(payload).subscribe(result => {
      expect(result).toEqual(mockResult);
      done();
    });
  });

  it('should handle dialog close with no result (undefined)', (done) => {
    const payload: DialogPayload = {
      type: DialogType.INFO,
      title: 'No result',
      message: 'Dialog closed',
    };
    mockDialogRef.afterClosed.mockReturnValue(of(undefined));
    service.openDialog(payload).subscribe(result => {
      expect(result).toBeUndefined();
      done();
    });
  });
});