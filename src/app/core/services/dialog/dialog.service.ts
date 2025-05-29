import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { DialogComponent, DialogData, DialogResult, DialogType } from '../../../shared/components/dialog/dialog.component';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  constructor(private dialog: MatDialog) {}

  private openDialog(data: DialogData): Observable<DialogResult> {
    const config: MatDialogConfig = {
      width: data.width || '400px',
      disableClose: data.disableClose || false,
      data: data,
      autoFocus: true,
      restoreFocus: true
    };

    const dialogRef = this.dialog.open(DialogComponent, config);
    return dialogRef.afterClosed();
  }

  // Error Dialog
  showError(
    title: string, 
    message: string, 
    details?: string, 
    options?: Partial<DialogData>
  ): Observable<DialogResult> {
    const data: DialogData = {
      type: DialogType.ERROR,
      title,
      message,
      details,
      confirmText: 'OK',
      showCancel: false,
      ...options
    };
    return this.openDialog(data);
  }

  // Warning Dialog
  showWarning(
    title: string, 
    message: string, 
    details?: string, 
    options?: Partial<DialogData>
  ): Observable<DialogResult> {
    const data: DialogData = {
      type: DialogType.WARNING,
      title,
      message,
      details,
      confirmText: 'OK',
      showCancel: false,
      ...options
    };
    return this.openDialog(data);
  }

  // Success Dialog
  showSuccess(
    title: string, 
    message: string, 
    options?: Partial<DialogData>
  ): Observable<DialogResult> {
    const data: DialogData = {
      type: DialogType.SUCCESS,
      title,
      message,
      confirmText: 'OK',
      showCancel: false,
      ...options
    };
    return this.openDialog(data);
  }

  // Info Dialog
  showInfo(
    title: string, 
    message: string, 
    options?: Partial<DialogData>
  ): Observable<DialogResult> {
    const data: DialogData = {
      type: DialogType.INFO,
      title,
      message,
      confirmText: 'OK',
      showCancel: false,
      ...options
    };
    return this.openDialog(data);
  }

  // Confirmation Dialog
  showConfirm(
    title: string, 
    message: string, 
    confirmText: string = 'Yes', 
    cancelText: string = 'No',
    options?: Partial<DialogData>
  ): Observable<DialogResult> {
    const data: DialogData = {
      type: DialogType.CONFIRM,
      title,
      message,
      confirmText,
      cancelText,
      showCancel: true,
      ...options
    };
    return this.openDialog(data);
  }

  // Convenience methods for common IoT scenarios
  showDeviceError(deviceName: string, error: any): Observable<DialogResult> {
    const details = error?.message || error?.error?.message || JSON.stringify(error, null, 2);
    return this.showError(
      'Device Error',
      `An error occurred with device "${deviceName}".`,
      details
    );
  }

  showProvisioningError(deviceName: string, error: any): Observable<DialogResult> {
    const details = error?.message || error?.error?.message || JSON.stringify(error, null, 2);
    return this.showError(
      'Provisioning Failed',
      `Failed to provision device "${deviceName}". Please check the details and try again.`,
      details
    );
  }

  showDeviceExists(deviceName: string, company: string): Observable<DialogResult> {

    const warningMessage = ((company) ?
      `Device "${deviceName}" is already registered for your organization "${company}". ` :
        `Device "${deviceName}" is already registered for another organization. `) +
        `If you performed an hard reset of your sensor and are trying to register ` +
        `it again, please delete the existing device from the registry first.`;

    return this.showWarning(
      'Device Already Exists',
      warningMessage
    );
  }

  showProvisioningSuccess(deviceName: string): Observable<DialogResult> {
    return this.showSuccess(
      'Provisioning Successful',
      `Device "${deviceName}" has been successfully provisioned and is ready for use.`
    );
  }

  confirmDeviceDeletion(deviceName: string): Observable<DialogResult> {
    return this.showConfirm(
      'Delete Device',
      `Are you sure you want to delete device "${deviceName}"? This action cannot be undone.`,
      'Delete',
      'Cancel'
    );
  }

  showAuthenticationError(): Observable<DialogResult> {
    return this.showError(
      'Authentication Failed',
      'Your session has expired or is invalid. Please log in again.',
      undefined,
      { disableClose: true }
    );
  }

  showNetworkError(): Observable<DialogResult> {
    return this.showError(
      'Network Error',
      'Unable to connect to the server. Please check your internet connection and try again.'
    );
  }

  // Custom dialog method for advanced usage
  showCustomDialog(config: DialogData): Observable<DialogResult> {
    return this.openDialog(config);
  }
}