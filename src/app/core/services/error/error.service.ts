import { Injectable } from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import { DeviceService } from '../device/device.service';
import { DeviceErrorType, ErrorType, AppErrorType } from '../../../../../shared/models';

interface ErrorsMap {
  [ErrorType.APP_ERROR]: { [key in AppErrorType] : string };
  [ErrorType.DEVICE_ERROR]: { [key in DeviceErrorType] : string };
}

@Injectable({
  providedIn: 'root'
})
export class ErrorService {

  private errors: ErrorsMap = {
    [ErrorType.APP_ERROR] : {
      [AppErrorType.API_ERROR]: ""
    },
    [ErrorType.DEVICE_ERROR]: {
      [DeviceErrorType.NONE]: "",
      [DeviceErrorType.CIPHERING_INITIALIZATION_ERROR]: "Device errored while initializing ciphering",
      [DeviceErrorType.INVALID_WIFI_CREDENTIALS]: "Cannot connect to WiFi with the provided credentials",
      [DeviceErrorType.FAILED_WIFI_CONNECTION_ATTEMPT]: "Cannot connect to WiFi network",
      [DeviceErrorType.INVALID_DEVICE_PROVISIONING_SETTINGS]: "Device received invalid TLS certificate or private key",
      [DeviceErrorType.INVALID_DEVICE_COMMAND]: "Device received an invalid command via USB",
      [DeviceErrorType.FAILED_PROVISIONING_SETTINGS_STORAGE]: "Device errored while attempting to encryot and store TLS certificate and private key",
      [DeviceErrorType.FAILED_DEVICE_PROVISIONING_ATTEMPT]: "Cannot provision device",
      [DeviceErrorType.FAILED_MQTT_BROKER_CONNECTION]: "Cannot connect device to MQTT broker",
      [DeviceErrorType.FAILED_DEVICE_CONFIGURATION_RETRIEVAL]: "Cannot retrieve device configuration",
      [DeviceErrorType.FAILED_SENSOR_DETECTION_REPORT]: "Device errored while attempting to publish an alarm report"
    }
  };

  translate(type: ErrorType, code: DeviceErrorType | AppErrorType): string {

    // We use a type guard to narrow down `code` to the appropriate enum
    if (type === ErrorType.APP_ERROR) {
      return this.errors[type][code as AppErrorType] || "An unknown error occurred";
    } else if (type === ErrorType.DEVICE_ERROR) {
      console.log("TRANSLATE: ", type, code);
      return this.errors[type][code as DeviceErrorType] || "An unknown error occurred";
    }
    return "An unknown error occurred"; // Fallback for an unknown error type

  }
  
}
