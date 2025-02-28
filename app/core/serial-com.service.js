"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceMessageType = exports.DeviceAppState = exports.SerialCom = void 0;
const electron_1 = require("electron");
const serialport_1 = require("serialport");
const parser_regex_1 = require("@serialport/parser-regex");
const parser_delimiter_1 = require("@serialport/parser-delimiter");
const models_1 = require("../../shared/models");
Object.defineProperty(exports, "DeviceAppState", { enumerable: true, get: function () { return models_1.DeviceAppState; } });
Object.defineProperty(exports, "DeviceMessageType", { enumerable: true, get: function () { return models_1.DeviceMessageType; } });
const rxjs_1 = require("rxjs");
// {"path":"/dev/tty.usbmodem3485187A35EC2","manufacturer":"Arduino","serialNumber":"3485187A35EC","locationId":"00100000","vendorId":"2341","productId":"0070"}
class SerialCom {
    constructor(browserWindow) {
        this.browserWindow = browserWindow;
        this.device = new rxjs_1.Subject();
        this.deviceConnectionStatus = new rxjs_1.Subject();
        this.deviceIncomingData = new rxjs_1.Subject();
        // Renderer to main process IPC communication
        electron_1.ipcMain.on('start-device-detection', () => {
            this.startDeviceDetection();
        });
        electron_1.ipcMain.on('close-serial-connection', () => {
            this.closeConnection();
        });
        // Main to renderer process IPC communication
        this.device.subscribe((device) => {
            this.browserWindow.webContents.send('device-found', device);
        });
        this.deviceConnectionStatus.subscribe((status) => {
            this.browserWindow.webContents.send('device-connection-status-update', status);
        });
        this.deviceIncomingData.subscribe((data) => {
            this.browserWindow.webContents.send('device-incoming-data', data);
        });
    }
    detectUSBDevice(manufacturer) {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                serialport_1.SerialPort.list().then((devices) => {
                    console.log(devices.length ?
                        `Serial interfaces scanning found the following available ports: \n${JSON.stringify(devices)}` :
                        "Serial interfaces scanning found no available ports");
                    const device = devices.find((entry) => entry.manufacturer &&
                        entry.manufacturer.includes(manufacturer));
                    if (device) {
                        console.log(`Found device: ${device.path} (${device.manufacturer})`);
                        clearInterval(interval);
                        resolve(device);
                    }
                }).catch((err) => {
                    console.error("Error while scanning available serial interfaces:", err);
                });
            }, 1000);
        });
    }
    connectToUSBDevice(device) {
        this.serialPort = new serialport_1.SerialPort({ path: device.path, baudRate: 9600 });
        this.delimiterParser = this.serialPort.pipe(new parser_delimiter_1.DelimiterParser({ delimiter: '\n' }));
        this.regexParser = this.delimiterParser.pipe(new parser_regex_1.RegexParser({ regex: /<\|(.*?)\|>/ }));
        this.serialPort.on('open', () => {
            console.log(`Opened serial connection with device ${device.path} (${device.manufacturer})`);
            this.deviceConnectionStatus.next(true);
        }).on('error', (err) => {
            console.error(`Error while communicating via serial connection with device ${device.path} (${device.manufacturer}):`, err);
            this.deviceConnectionStatus.next(false);
        }).on('close', () => {
            console.log(`Closed serial connection with device ${device.path} (${device.manufacturer})`);
            this.deviceConnectionStatus.next(false);
        });
        this.delimiterParser.on('data', (data) => {
            const payload = data.toString().trim();
            console.log(`Received data via serial connection from DELIMITER: ${payload}`);
        });
        this.regexParser.on('data', (data) => {
            const payload = data.toString();
            console.log(`Received data via serial connection from REGEX PARSER: ${payload}`);
            try {
                const jsonPayload = JSON.parse(payload);
                this.deviceIncomingData.next(Object.assign({}, jsonPayload));
            }
            catch (e) {
                console.log("Data received via serial connection is not valid Json");
            }
        });
    }
    closeConnection() {
        if (this.serialPort) {
            try {
                if (this.serialPort.isOpen) {
                    console.log('Closing existing serial connection...');
                    this.serialPort.close();
                }
            }
            catch (err) {
                console.error('Error closing serial port:', err);
            }
            this.serialPort.removeAllListeners();
            this.delimiterParser.removeAllListeners();
            this.regexParser.removeAllListeners();
        }
    }
    startDeviceDetection() {
        /**
         * In a real-world application, you would want to specify your
         * actual manufacturer name here. For the sake of this example,
         * we are using 'Arduino' as the manufacturer name.
         */
        this.detectUSBDevice('Arduino').then((device) => {
            this.device.next(device);
            const deviceStatusSubscription = this.deviceConnectionStatus.subscribe((status) => {
                if (!status) {
                    console.log('Device disconnected, restarting detection...');
                    deviceStatusSubscription.unsubscribe();
                    setTimeout(() => {
                        this.startDeviceDetection();
                    }, 5000);
                }
            });
            this.connectToUSBDevice(device);
        });
    }
}
exports.SerialCom = SerialCom;
//# sourceMappingURL=serial-com.service.js.map