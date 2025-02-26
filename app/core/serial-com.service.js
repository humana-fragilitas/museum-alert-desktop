"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerialCom = void 0;
const serialport_1 = require("serialport");
const parser_regex_1 = require("@serialport/parser-regex");
const rxjs_1 = require("rxjs");
class SerialCom {
    constructor(browserWindow) {
        this.browserWindow = browserWindow;
        this.deviceStatus = new rxjs_1.Subject();
    }
    detectUSBDevice(manufacturer) {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                serialport_1.SerialPort.list().then((devices) => {
                    console.log(devices.length ? `Serial interfaces scanning found the following available ports: \n${JSON.stringify(devices)}` :
                        "Serial interfaces scanning found no available ports");
                    const device = devices.find((entry) => entry.manufacturer && entry.manufacturer.includes(manufacturer));
                    if (device) {
                        console.log(`Found device: ${device.path} (${device.manufacturer})`);
                        clearInterval(interval);
                        resolve(device);
                    }
                }).catch((err) => {
                    console.error("Error while scanning available serial interfaces:", err);
                });
            }, 2000);
        });
    }
    connectToUSBDevice(device) {
        this.serialPort = new serialport_1.SerialPort({ path: device.path, baudRate: 9600 });
        this.regexParser = this.serialPort.pipe(new parser_regex_1.RegexParser({ regex: /<\|(.*?)\|>/ }));
        this.serialPort.on('open', () => {
            console.log(`Opened serial connection with device ${device.path} (${device.manufacturer})`);
            this.deviceStatus.next({ connected: true });
        }).on('error', (err) => {
            console.error(`Error while communicating via serial connection with device ${device.path} (${device.manufacturer}):`, err);
            this.deviceStatus.next({ connected: false });
        }).on('close', () => {
            console.log(`Closed serial connection with device ${device.path} (${device.manufacturer})`);
            this.deviceStatus.next({ connected: false });
        });
        this.regexParser.on('data', (data) => {
            console.log(`Received data via serial connection from device ${device.path} (${device.manufacturer}):`, data);
            this.deviceStatus.next({ connected: true, data: data });
        });
        return this.deviceStatus;
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
        }
    }
}
exports.SerialCom = SerialCom;
//# sourceMappingURL=serial-com.service.js.map