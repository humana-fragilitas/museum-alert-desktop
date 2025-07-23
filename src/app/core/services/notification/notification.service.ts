import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DeviceService } from '../device/device.service';
import { DeviceErrorType, DeviceIncomingData, DeviceMessageType } from '../../../../../app/shared';
import { ErrorService } from '../error/error.service';
import { TranslateService } from '@ngx-translate/core';


@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor (
    private readonly snackBar: MatSnackBar,
    private readonly deviceService: DeviceService,
    private readonly translate: TranslateService,
    private readonly errorService: ErrorService
  ) {

    this.deviceService.error$.subscribe(
      (message: Nullable<DeviceIncomingData>) => {
        console.log('[NotificationService]: got new error:', message);
        if (message && message.type === DeviceMessageType.ERROR) {
           this.onError(message.data.error);
        }
      }
    );

  }

  onError(type: Nullable<DeviceErrorType>) {

    console.log(`[NotificationService]: handling device error:`, type);
    this.snackBar.open(
      this.translate.instant(this.errorService.toTranslationTag(type)), 
      this.translate.instant('COMMON.ACTIONS.DISMISS')
    );

  }
  
}
