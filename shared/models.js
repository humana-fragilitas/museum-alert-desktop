"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceErrorType = exports.DeviceMessageType = exports.DeviceAppState = void 0;
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
})(DeviceAppState || (exports.DeviceAppState = DeviceAppState = {}));
;
var DeviceMessageType;
(function (DeviceMessageType) {
    DeviceMessageType[DeviceMessageType["APP_STATE"] = 0] = "APP_STATE";
    DeviceMessageType[DeviceMessageType["WIFI_NETWORKS_LIST"] = 1] = "WIFI_NETWORKS_LIST";
    DeviceMessageType[DeviceMessageType["ERROR"] = 2] = "ERROR";
})(DeviceMessageType || (exports.DeviceMessageType = DeviceMessageType = {}));
;
var DeviceErrorType;
(function (DeviceErrorType) {
    DeviceErrorType[DeviceErrorType["CIPHERING_INITIALIZATION_ERROR"] = 0] = "CIPHERING_INITIALIZATION_ERROR";
    DeviceErrorType[DeviceErrorType["INVALID_WIFI_CREDENTIALS"] = 1] = "INVALID_WIFI_CREDENTIALS";
    DeviceErrorType[DeviceErrorType["FAILED_WIFI_CONNECTION_ATTEMPT"] = 2] = "FAILED_WIFI_CONNECTION_ATTEMPT";
    DeviceErrorType[DeviceErrorType["INVALID_DEVICE_PROVISIONING_SETTINGS"] = 3] = "INVALID_DEVICE_PROVISIONING_SETTINGS";
    DeviceErrorType[DeviceErrorType["FAILED_PROVISIONING_SETTINGS_STORAGE"] = 4] = "FAILED_PROVISIONING_SETTINGS_STORAGE";
    DeviceErrorType[DeviceErrorType["FAILED_DEVICE_PROVISIONING_ATTEMPT"] = 5] = "FAILED_DEVICE_PROVISIONING_ATTEMPT";
    DeviceErrorType[DeviceErrorType["FAILED_MQTT_BROKER_CONNECTION"] = 6] = "FAILED_MQTT_BROKER_CONNECTION";
    DeviceErrorType[DeviceErrorType["FAILED_SENSOR_DETECTION_REPORT"] = 7] = "FAILED_SENSOR_DETECTION_REPORT";
})(DeviceErrorType || (exports.DeviceErrorType = DeviceErrorType = {}));
;
//# sourceMappingURL=models.js.map