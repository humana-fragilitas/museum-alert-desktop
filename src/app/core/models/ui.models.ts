import { HttpErrorResponse } from '@angular/common/http';

import { AuthenticationExpiredError } from '@interceptors/auth-token.interceptor';
import { USBCommandTimeoutException } from '@services/device/device.service';


export enum DialogType {
  ERROR = 'error',
  WARNING = 'warning',
  SUCCESS = 'success',
  INFO = 'info',
  CONFIRM = 'confirm'
}

export interface DialogPayload {
  type?: DialogType;
  exception?: HttpErrorResponse | AuthenticationExpiredError | USBCommandTimeoutException;
  title: string;
  message: string;
  messageParams?: { [key: string]: string | number };
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

export interface DialogResult {
  confirmed: boolean;
  data?: any;
}