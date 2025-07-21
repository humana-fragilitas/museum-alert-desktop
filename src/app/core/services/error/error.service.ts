import { Injectable } from '@angular/core';
import { DeviceErrorType } from '../../../../../app/shared';


type ErrorsMap = {
  [key in keyof typeof DeviceErrorType as string]: string;
};

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

  toTranslationTag(code: Nullable<DeviceErrorType>): string {

    const tag = this.errors[code as DeviceErrorType];
    console.log(tag ? `[ErrorService]: error code ${code} corresponds to translation tag: "${tag}"` :
      `[ErrorService]: error code ${code} does not correspond to any translation tag`
    );
    return tag || "ERRORS.DEVICE.UNKNOWN_ERROR";

  }
  
}
