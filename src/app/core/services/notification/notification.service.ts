import { TranslateService } from '@ngx-translate/core';

import { Injectable,
         effect } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DeviceService } from '@services/device/device.service';
import { DeviceErrorType,
         DeviceMessageType } from '@shared-with-electron';
import { ErrorService } from '@services/error/error.service';


@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private readonly deviceErrorSignal = this.deviceService.error;

  constructor (
    private readonly snackBar: MatSnackBar,
    private readonly deviceService: DeviceService,
    private readonly translate: TranslateService,
    private readonly errorService: ErrorService
  ) {
    
    effect(() => {
      const message = this.deviceErrorSignal();
      console.log('[NotificationService]: got new error:', message);
      if (message && message.type === DeviceMessageType.ERROR) {
        this.onError(message.data.error);
      }
    });
    
  }

  onError(type: Nullable<DeviceErrorType>) {
    console.log(`[NotificationService]: handling device error:`, type);
    this.snackBar.open(
      this.translate.instant(this.errorService.toTranslationTag(type)),
      this.translate.instant('COMMON.ACTIONS.DISMISS')
    );
  }

}