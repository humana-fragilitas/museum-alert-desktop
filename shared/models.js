"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorType = exports.AppErrorType = exports.USBCommandType = exports.DeviceErrorType = exports.DeviceMessageType = exports.DeviceAppState = void 0;
var DeviceAppState;
(function (DeviceAppState) {
    DeviceAppState[DeviceAppState["STARTED"] = 0] = "STARTED";
    DeviceAppState[DeviceAppState["INITIALIZE_CIPHERING"] = 1] = "INITIALIZE_CIPHERING";
    DeviceAppState[DeviceAppState["CONFIGURE_WIFI"] = 2] = "CONFIGURE_WIFI";
    DeviceAppState[DeviceAppState["CONFIGURE_CERTIFICATES"] = 3] = "CONFIGURE_CERTIFICATES";
    DeviceAppState[DeviceAppState["CONNECT_TO_WIFI"] = 4] = "CONNECT_TO_WIFI";
    DeviceAppState[DeviceAppState["PROVISION_DEVICE"] = 5] = "PROVISION_DEVICE";
    DeviceAppState[DeviceAppState["CONNECT_TO_MQTT_BROKER"] = 6] = "CONNECT_TO_MQTT_BROKER";
    DeviceAppState[DeviceAppState["DEVICE_INITIALIZED"] = 7] = "DEVICE_INITIALIZED";
    DeviceAppState[DeviceAppState["FATAL_ERROR"] = 8] = "FATAL_ERROR";
})(DeviceAppState || (exports.DeviceAppState = DeviceAppState = {}));
;
var DeviceMessageType;
(function (DeviceMessageType) {
    DeviceMessageType[DeviceMessageType["APP_STATE"] = 0] = "APP_STATE";
    DeviceMessageType[DeviceMessageType["WIFI_NETWORKS_LIST"] = 1] = "WIFI_NETWORKS_LIST";
    DeviceMessageType[DeviceMessageType["ERROR"] = 2] = "ERROR";
    DeviceMessageType[DeviceMessageType["ACKNOWLEDGMENT"] = 3] = "ACKNOWLEDGMENT";
})(DeviceMessageType || (exports.DeviceMessageType = DeviceMessageType = {}));
;
var DeviceErrorType;
(function (DeviceErrorType) {
    DeviceErrorType[DeviceErrorType["NONE"] = 0] = "NONE";
    DeviceErrorType[DeviceErrorType["CIPHERING_INITIALIZATION_ERROR"] = 1] = "CIPHERING_INITIALIZATION_ERROR";
    DeviceErrorType[DeviceErrorType["INVALID_WIFI_CREDENTIALS"] = 2] = "INVALID_WIFI_CREDENTIALS";
    DeviceErrorType[DeviceErrorType["FAILED_WIFI_CONNECTION_ATTEMPT"] = 3] = "FAILED_WIFI_CONNECTION_ATTEMPT";
    DeviceErrorType[DeviceErrorType["INVALID_DEVICE_PROVISIONING_SETTINGS"] = 4] = "INVALID_DEVICE_PROVISIONING_SETTINGS";
    DeviceErrorType[DeviceErrorType["INVALID_DEVICE_COMMAND"] = 5] = "INVALID_DEVICE_COMMAND";
    DeviceErrorType[DeviceErrorType["FAILED_PROVISIONING_SETTINGS_STORAGE"] = 6] = "FAILED_PROVISIONING_SETTINGS_STORAGE";
    DeviceErrorType[DeviceErrorType["FAILED_DEVICE_PROVISIONING_ATTEMPT"] = 7] = "FAILED_DEVICE_PROVISIONING_ATTEMPT";
    DeviceErrorType[DeviceErrorType["FAILED_MQTT_BROKER_CONNECTION"] = 8] = "FAILED_MQTT_BROKER_CONNECTION";
    DeviceErrorType[DeviceErrorType["FAILED_DEVICE_CONFIGURATION_RETRIEVAL"] = 9] = "FAILED_DEVICE_CONFIGURATION_RETRIEVAL";
    DeviceErrorType[DeviceErrorType["FAILED_SENSOR_DETECTION_REPORT"] = 10] = "FAILED_SENSOR_DETECTION_REPORT";
})(DeviceErrorType || (exports.DeviceErrorType = DeviceErrorType = {}));
;
var USBCommandType;
(function (USBCommandType) {
    USBCommandType[USBCommandType["HARD_RESET"] = 0] = "HARD_RESET";
    // Add more commands here
    USBCommandType[USBCommandType["USB_COMMAND_TYPE_COUNT"] = 1] = "USB_COMMAND_TYPE_COUNT";
    USBCommandType[USBCommandType["USB_COMMAND_INVALID"] = -1] = "USB_COMMAND_INVALID";
})(USBCommandType || (exports.USBCommandType = USBCommandType = {}));
;
var AppErrorType;
(function (AppErrorType) {
    AppErrorType[AppErrorType["UNAUTHORIZED"] = 0] = "UNAUTHORIZED";
    AppErrorType[AppErrorType["FAILED_PROVISIONING_CLAIM_CREATION"] = 1] = "FAILED_PROVISIONING_CLAIM_CREATION";
    AppErrorType[AppErrorType["FAILED_EXISTING_THING_CHECK"] = 2] = "FAILED_EXISTING_THING_CHECK";
    AppErrorType[AppErrorType["THING_ALREADY_EXISTS"] = 3] = "THING_ALREADY_EXISTS";
    AppErrorType[AppErrorType["THING_ALREADY_EXISTS_IN_OTHER_ORGANIZATION"] = 4] = "THING_ALREADY_EXISTS_IN_OTHER_ORGANIZATION";
    AppErrorType[AppErrorType["GENERIC_ERROR"] = 5] = "GENERIC_ERROR";
})(AppErrorType || (exports.AppErrorType = AppErrorType = {}));
;
var ErrorType;
(function (ErrorType) {
    ErrorType[ErrorType["DEVICE_ERROR"] = 0] = "DEVICE_ERROR";
    ErrorType[ErrorType["APP_ERROR"] = 1] = "APP_ERROR";
})(ErrorType || (exports.ErrorType = ErrorType = {}));
;
//# sourceMappingURL=models.js.map