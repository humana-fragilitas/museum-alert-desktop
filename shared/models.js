"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceMessageType = exports.DeviceAppState = void 0;
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
    DeviceMessageType[DeviceMessageType["SENSOR_DETECTION"] = 2] = "SENSOR_DETECTION";
})(DeviceMessageType || (exports.DeviceMessageType = DeviceMessageType = {}));
;
//# sourceMappingURL=models.js.map