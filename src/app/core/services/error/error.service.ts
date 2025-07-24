import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialogConfig } from '@angular/material/dialog';

import { DeviceErrorType } from '@shared-with-electron/.';
import { DialogService } from '@services/dialog/dialog.service';
import { AuthenticationExpiredError } from '@interceptors/auth-token.interceptor';
import { DialogPayload, DialogResult, ErrorApiResponse } from '@models/.';
import { USBCommandTimeoutException } from '@services/device/device.service';


type ErrorsMap = {
  [key in keyof typeof DeviceErrorType as string]: string;
};

// Configuration interface for showModal method
interface ShowModalConfig {
  exception?: HttpErrorResponse | AuthenticationExpiredError | USBCommandTimeoutException;
  data: DialogPayload;
  dialogConfig?: MatDialogConfig;
  onClosed?: (result?: DialogResult) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  private errors: ErrorsMap = {
    [DeviceErrorType.INVALID_WIFI_CREDENTIALS]: "ERRORS.DEVICE.INVALID_WIFI_CREDENTIALS",
    [DeviceErrorType.FAILED_WIFI_CONNECTION_ATTEMPT]: "ERRORS.DEVICE.FAILED_WIFI_CONNECTION_ATTEMPT",
    [DeviceErrorType.INVALID_DEVICE_PROVISIONING_SETTINGS]: "ERRORS.DEVICE.INVALID_DEVICE_PROVISIONING_SETTINGS",
    [DeviceErrorType.INVALID_DEVICE_COMMAND]: "ERRORS.DEVICE.INVALID_DEVICE_COMMAND",
    [DeviceErrorType.FAILED_PROVISIONING_SETTINGS_STORAGE]: "ERRORS.DEVICE.FAILED_PROVISIONING_SETTINGS_STORAGE",
    [DeviceErrorType.FAILED_DEVICE_PROVISIONING_ATTEMPT]: "ERRORS.DEVICE.FAILED_DEVICE_PROVISIONING_ATTEMPT",
    [DeviceErrorType.FAILED_MQTT_BROKER_CONNECTION]: "ERRORS.DEVICE.FAILED_MQTT_BROKER_CONNECTION",
    [DeviceErrorType.FAILED_DEVICE_CONFIGURATION_RETRIEVAL]: "ERRORS.DEVICE.FAILED_DEVICE_CONFIGURATION_RETRIEVAL",
    [DeviceErrorType.FAILED_SENSOR_DETECTION_REPORT]: "ERRORS.DEVICE.FAILED_SENSOR_DETECTION_REPORT"
  };

  constructor(private readonly dialogService: DialogService) { }

  toTranslationTag(code: Nullable<DeviceErrorType>): string {
    const tag = this.errors[code as DeviceErrorType];
    console.log(tag ? `[ErrorService]: error code ${code} corresponds to translation tag: "${tag}"` :
      `[ErrorService]: error code ${code} does not correspond to any translation tag`
    );
    return tag || "ERRORS.DEVICE.UNKNOWN_ERROR";
  }

  showModal(config: ShowModalConfig): void {
    const { 
      exception, 
      data, 
      dialogConfig, 
      onClosed
    } = config;

    // Skip authentication errors by default (unless explicitly overridden)
    if (exception instanceof AuthenticationExpiredError) {
      console.log(`[ErrorService]: skipping error modal: error is of type 'AuthenticationExpiredError':`, exception);
      return;
    }

    // Log the error type
    if (exception) {
      console.error('[ErrorService]: showing error modal for error:', exception.error as ErrorApiResponse);
    } else {
      console.error('[ErrorService]: showing generic error modal');
    }

    // Open the dialog
    const dialogObservable = this.dialogService.openDialog(data, dialogConfig);

    // Subscribe to dialog close event if callback provided
    if (onClosed) {
      dialogObservable.subscribe({
        next: (result) => onClosed(result),
        error: (error) => console.error('[ErrorService]: dialog close error:', error)
      });
    }
  }

}