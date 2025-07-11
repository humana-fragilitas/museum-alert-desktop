import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { DialogService } from './dialog.service';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { DialogData, DialogResult, DialogType } from '../../models';

describe('DialogService', () => {
  let service: DialogService;
  let mockDialog: jest.Mocked<MatDialog>;
  let mockDialogRef: jest.Mocked<MatDialogRef<DialogComponent>>;

  beforeEach(() => {
    // Create mock objects
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

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('showError', () => {
    it('should open error dialog with correct configuration', () => {
      const title = 'Test Error';
      const message = 'Test error message';
      const details = 'Error details';
      const mockResult: DialogResult = { confirmed: false };

      mockDialogRef.afterClosed.mockReturnValue(of(mockResult));

      service.showError(title, message, details).subscribe(result => {
        expect(result).toEqual(mockResult);
      });

      expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
        width: '400px',
        disableClose: false,
        data: {
          type: DialogType.ERROR,
          title,
          message,
          details,
          confirmText: 'OK',
          showCancel: false,
        },
        autoFocus: true,
        restoreFocus: true,
      });
    });

    it('should merge custom options with default error configuration', () => {
      const title = 'Custom Error';
      const message = 'Custom message';
      const customOptions = {
        width: '600px',
        confirmText: 'Close',
        disableClose: true,
      };

      mockDialogRef.afterClosed.mockReturnValue(of({ confirmed: false }));

      service.showError(title, message, undefined, customOptions);

      expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
        width: '600px',
        disableClose: true,
        data: {
          type: DialogType.ERROR,
          title,
          message,
          details: undefined,
          confirmText: 'Close',
          showCancel: false,
          width: '600px',
          disableClose: true,
        },
        autoFocus: true,
        restoreFocus: true,
      });
    });
  });

  describe('showWarning', () => {
    it('should open warning dialog with correct configuration', () => {
      const title = 'Test Warning';
      const message = 'Test warning message';
      const mockResult: DialogResult = { confirmed: false };

      mockDialogRef.afterClosed.mockReturnValue(of(mockResult));

      service.showWarning(title, message).subscribe(result => {
        expect(result).toEqual(mockResult);
      });

      expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
        width: '400px',
        disableClose: false,
        data: {
          type: DialogType.WARNING,
          title,
          message,
          confirmText: 'OK',
          showCancel: false,
        },
        autoFocus: true,
        restoreFocus: true,
      });
    });
  });

  describe('showSuccess', () => {
    it('should open success dialog with correct configuration', () => {
      const title = 'Test Success';
      const message = 'Test success message';
      const mockResult: DialogResult = { confirmed: true };

      mockDialogRef.afterClosed.mockReturnValue(of(mockResult));

      service.showSuccess(title, message).subscribe(result => {
        expect(result).toEqual(mockResult);
      });

      expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
        width: '400px',
        disableClose: false,
        data: {
          type: DialogType.SUCCESS,
          title,
          message,
          confirmText: 'OK',
          showCancel: false,
        },
        autoFocus: true,
        restoreFocus: true,
      });
    });
  });

  describe('showInfo', () => {
    it('should open info dialog with correct configuration', () => {
      const title = 'Test Info';
      const message = 'Test info message';
      const mockResult: DialogResult = { confirmed: false };

      mockDialogRef.afterClosed.mockReturnValue(of(mockResult));

      service.showInfo(title, message).subscribe(result => {
        expect(result).toEqual(mockResult);
      });

      expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
        width: '400px',
        disableClose: false,
        data: {
          type: DialogType.INFO,
          title,
          message,
          confirmText: 'OK',
          showCancel: false,
        },
        autoFocus: true,
        restoreFocus: true,
      });
    });
  });

  describe('showConfirm', () => {
    it('should open confirmation dialog with default button texts', () => {
      const title = 'Confirm Action';
      const message = 'Are you sure?';
      const mockResult: DialogResult = { confirmed: true };

      mockDialogRef.afterClosed.mockReturnValue(of(mockResult));

      service.showConfirm(title, message).subscribe(result => {
        expect(result).toEqual(mockResult);
      });

      expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
        width: '400px',
        disableClose: false,
        data: {
          type: DialogType.CONFIRM,
          title,
          message,
          confirmText: 'Yes',
          cancelText: 'No',
          showCancel: true,
        },
        autoFocus: true,
        restoreFocus: true,
      });
    });

    it('should open confirmation dialog with custom button texts', () => {
      const title = 'Delete Item';
      const message = 'This action cannot be undone';
      const confirmText = 'Delete';
      const cancelText = 'Cancel';

      mockDialogRef.afterClosed.mockReturnValue(of({ confirmed: false }));

      service.showConfirm(title, message, confirmText, cancelText);

      expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
        width: '400px',
        disableClose: false,
        data: {
          type: DialogType.CONFIRM,
          title,
          message,
          confirmText,
          cancelText,
          showCancel: true,
        },
        autoFocus: true,
        restoreFocus: true,
      });
    });
  });

  describe('IoT-specific convenience methods', () => {
    describe('showDeviceError', () => {
      it('should show device error with error message', () => {
        const deviceName = 'TestDevice';
        const error = { message: 'Connection failed' };

        mockDialogRef.afterClosed.mockReturnValue(of({ confirmed: false }));

        service.showDeviceError(deviceName, error);

        expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
          width: '400px',
          disableClose: false,
          data: {
            type: DialogType.ERROR,
            title: 'Device Error',
            message: 'An error occurred with device "TestDevice".',
            details: 'Connection failed',
            confirmText: 'OK',
            showCancel: false,
          },
          autoFocus: true,
          restoreFocus: true,
        });
      });

      it('should show device error with nested error message', () => {
        const deviceName = 'TestDevice';
        const error = { error: { message: 'Network timeout' } };

        mockDialogRef.afterClosed.mockReturnValue(of({ confirmed: false }));

        service.showDeviceError(deviceName, error);

        const expectedData = expect.objectContaining({
          details: 'Network timeout',
        });

        expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
          width: '400px',
          disableClose: false,
          data: expectedData,
          autoFocus: true,
          restoreFocus: true,
        });
      });

      it('should show device error with JSON stringified error when no message', () => {
        const deviceName = 'TestDevice';
        const error = { code: 500, status: 'Internal Server Error' };

        mockDialogRef.afterClosed.mockReturnValue(of({ confirmed: false }));

        service.showDeviceError(deviceName, error);

        const expectedDetails = JSON.stringify(error, null, 2);
        const expectedData = expect.objectContaining({
          details: expectedDetails,
        });

        expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
          width: '400px',
          disableClose: false,
          data: expectedData,
          autoFocus: true,
          restoreFocus: true,
        });
      });
    });

    describe('showProvisioningError', () => {
      it('should show provisioning error with correct message', () => {
        const deviceName = 'TestDevice';
        const error = { message: 'Provisioning failed' };

        mockDialogRef.afterClosed.mockReturnValue(of({ confirmed: false }));

        service.showProvisioningError(deviceName, error);

        expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
          width: '400px',
          disableClose: false,
          data: {
            type: DialogType.ERROR,
            title: 'Provisioning Failed',
            message: 'Failed to provision device "TestDevice". Please check the details and try again.',
            details: 'Provisioning failed',
            confirmText: 'OK',
            showCancel: false,
          },
          autoFocus: true,
          restoreFocus: true,
        });
      });
    });

    describe('showDeviceExists', () => {
      it('should show device exists warning for same organization', () => {
        const deviceName = 'TestDevice';
        const company = 'TestCompany';

        mockDialogRef.afterClosed.mockReturnValue(of({ confirmed: false }));

        service.showDeviceExists(deviceName, company);

        const expectedMessage = 
          'Device "TestDevice" is already registered for your organization "TestCompany". ' +
          'If you performed an hard reset of your sensor and are trying to register ' +
          'it again, please delete the existing device from the registry first.';

        expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
          width: '400px',
          disableClose: false,
          data: {
            type: DialogType.WARNING,
            title: 'Device Already Exists',
            message: expectedMessage,
            confirmText: 'OK',
            showCancel: false,
          },
          autoFocus: true,
          restoreFocus: true,
        });
      });

      it('should show device exists warning for different organization', () => {
        const deviceName = 'TestDevice';
        const company = '';

        mockDialogRef.afterClosed.mockReturnValue(of({ confirmed: false }));

        service.showDeviceExists(deviceName, company);

        const expectedMessage = 
          'Device "TestDevice" is already registered for another organization. ' +
          'If you are its legimitate administrator, please delete the existing device ' +
          'from the registry first.';

        expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
          width: '400px',
          disableClose: false,
          data: {
            type: DialogType.WARNING,
            title: 'Device Already Exists',
            message: expectedMessage,
            confirmText: 'OK',
            showCancel: false,
          },
          autoFocus: true,
          restoreFocus: true,
        });
      });
    });

    describe('showProvisioningSuccess', () => {
      it('should show provisioning success message', () => {
        const deviceName = 'TestDevice';

        mockDialogRef.afterClosed.mockReturnValue(of({ confirmed: true }));

        service.showProvisioningSuccess(deviceName);

        expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
          width: '400px',
          disableClose: false,
          data: {
            type: DialogType.SUCCESS,
            title: 'Provisioning Successful',
            message: 'Device "TestDevice" has been successfully provisioned and is ready for use.',
            confirmText: 'OK',
            showCancel: false,
          },
          autoFocus: true,
          restoreFocus: true,
        });
      });
    });

    describe('confirmDeviceDeletion', () => {
      it('should show device deletion confirmation', () => {
        const deviceName = 'TestDevice';

        mockDialogRef.afterClosed.mockReturnValue(of({ confirmed: true }));

        service.confirmDeviceDeletion(deviceName);

        expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
          width: '400px',
          disableClose: false,
          data: {
            type: DialogType.CONFIRM,
            title: 'Delete Device',
            message: 'Are you sure you want to delete device "TestDevice"? This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            showCancel: true,
          },
          autoFocus: true,
          restoreFocus: true,
        });
      });
    });

    describe('showAuthenticationError', () => {
      it('should show authentication error with disableClose option', () => {
        mockDialogRef.afterClosed.mockReturnValue(of({ confirmed: false }));

        service.showAuthenticationError();

        expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
          width: '400px',
          disableClose: true,
          data: {
            type: DialogType.ERROR,
            title: 'Authentication Failed',
            message: 'Your session has expired or is invalid. Please log in again.',
            confirmText: 'OK',
            showCancel: false,
            disableClose: true,
          },
          autoFocus: true,
          restoreFocus: true,
        });
      });
    });

    describe('showNetworkError', () => {
      it('should show network error message', () => {
        mockDialogRef.afterClosed.mockReturnValue(of({ confirmed: false }));

        service.showNetworkError();

        expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
          width: '400px',
          disableClose: false,
          data: {
            type: DialogType.ERROR,
            title: 'Network Error',
            message: 'Unable to connect to the server. Please check your internet connection and try again.',
            confirmText: 'OK',
            showCancel: false,
          },
          autoFocus: true,
          restoreFocus: true,
        });
      });
    });
  });

  describe('showCustomDialog', () => {
    it('should open custom dialog with provided configuration', () => {
      const customConfig: DialogData = {
        type: DialogType.INFO,
        title: 'Custom Dialog',
        message: 'Custom message',
        width: '500px',
        confirmText: 'Custom OK',
        showCancel: true,
        cancelText: 'Custom Cancel',
      };

      mockDialogRef.afterClosed.mockReturnValue(of({ confirmed: true }));

      service.showCustomDialog(customConfig);

      expect(mockDialog.open).toHaveBeenCalledWith(DialogComponent, {
        width: '500px',
        disableClose: false,
        data: customConfig,
        autoFocus: true,
        restoreFocus: true,
      });
    });
  });

  describe('Observable handling', () => {
    it('should return observable that emits dialog result', (done) => {
      const mockResult: DialogResult = { confirmed: true, data: { test: 'data' } };
      mockDialogRef.afterClosed.mockReturnValue(of(mockResult));

      service.showInfo('Test', 'Test message').subscribe(result => {
        expect(result).toEqual(mockResult);
        done();
      });
    });

    it('should handle dialog close without result', (done) => {
      mockDialogRef.afterClosed.mockReturnValue(of(undefined));

      service.showInfo('Test', 'Test message').subscribe(result => {
        expect(result).toBeUndefined();
        done();
      });
    });
  });
});