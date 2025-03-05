import { Injectable } from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import { DeviceService } from './device.service';
import { DeviceErrorType, ErrorType } from '@shared/models';
import { ErrorService } from './error.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor (
    private snackBar: MatSnackBar,
    private deviceService: DeviceService,
    private errorService: ErrorService
  ) {

    deviceService.error$.subscribe((error: DeviceErrorType) => {

      console.log("NotificationService: received error: ", error);

      if (error != DeviceErrorType.NONE) {
        snackBar.open(errorService.translate(ErrorType.DEVICE_ERROR, error), "Dismiss")
      }

    });

  }
  
}
