import { Injectable } from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import { DeviceService } from '../device/device.service';
import { DeviceErrorType, DeviceIncomingData } from '../../../../../app/shared/models';
import { ErrorService } from '../error/error.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthenticationExpiredError } from '../../interceptors/auth-token.interceptor';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor (
    private snackBar: MatSnackBar,
    private deviceService: DeviceService,
    private translate: TranslateService,
    private errorService: ErrorService
  ) {

    deviceService.error$.subscribe(
      (message: Nullable<DeviceIncomingData>) => {
        if (message) {
           this.onError((message!.data as { error: DeviceErrorType }).error);
        }
      }
    );

  }

  onError(
    target: Nullable<DeviceErrorType>,
    error: HttpErrorResponse | null = null
  ) {

    if (!target == null || error instanceof AuthenticationExpiredError) {
      return;
    }

    console.log(`[NotificationService]: received device error:`, target);

    this.snackBar.open(
      this.translate.instant(this.errorService.toTranslationTag(target)), 
      this.translate.instant('COMMON.ACTIONS.DISMISS')
    );

  }
  
}
