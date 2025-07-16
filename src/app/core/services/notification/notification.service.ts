import { Injectable } from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import { DeviceService } from '../device/device.service';
import { DeviceErrorType, DeviceIncomingData, ErrorType } from '../../../../../app/shared/models';
import { ErrorService } from '../error/error.service';
import { AppErrorType } from '../../../../../app/shared/models';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthenticationExpiredError } from '../../interceptors/auth-token.interceptor';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor (
    private snackBar: MatSnackBar,
    private deviceService: DeviceService,
    private errorService: ErrorService
  ) {

    deviceService.error$.subscribe(
      (message: Nullable<DeviceIncomingData>) => {
        if (message) {
           this.onError(ErrorType.DEVICE_ERROR, (message!.data as { error: DeviceErrorType }).error);
        }
      }
    );

  }

  onError(
    type: ErrorType,
    target: Nullable<DeviceErrorType | AppErrorType>,
    error: HttpErrorResponse | null = null
  ) {

    if (target == null || error instanceof AuthenticationExpiredError) {
      return;
    }

    const typeName = (type == ErrorType.DEVICE_ERROR) ?
      'device' : (type == ErrorType.APP_ERROR) ? 'application'
        : 'unknown';

    console.log(
      `NotificationService: received ` +
      `${typeName} ` +
      `error: `,
      target
    );

    this.snackBar.open(
      this.errorService.translate(
        type, target
      ), 'Dismiss'
    );

  }
  
}
