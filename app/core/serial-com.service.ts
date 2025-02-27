import {app, BrowserWindow, ipcMain} from 'electron';
import { SerialPort } from 'serialport';
import { PortInfo } from '@serialport/bindings-cpp';
import { RegexParser } from '@serialport/parser-regex';
import { DelimiterParser } from '@serialport/parser-delimiter';
import { Subject } from 'rxjs';

// {"path":"/dev/tty.usbmodem3485187A35EC2","manufacturer":"Arduino","serialNumber":"3485187A35EC","locationId":"00100000","vendorId":"2341","productId":"0070"}

interface DeviceStatus {
    connected: boolean;
    data?: string | null;
}

class SerialCom {

    private serialPort!: SerialPort;
    private regexParser!: RegexParser;
    private delimiterParser!: DelimiterParser;
    private deviceStatus: Subject<DeviceStatus> = new Subject<DeviceStatus>();

    constructor(private browserWindow: BrowserWindow) { }

    detectUSBDevice(manufacturer: string): Promise<PortInfo> {

        return new Promise((resolve) => {

            const interval = setInterval(() => {

                SerialPort.list().then((devices) => {
                
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

    connectToUSBDevice(device: PortInfo): Subject<DeviceStatus> {

        this.serialPort = new SerialPort({ path: device.path, baudRate: 9600 });
        this.delimiterParser = this.serialPort.pipe(new DelimiterParser({delimiter: '\n' }));
        this.regexParser = this.delimiterParser.pipe(new RegexParser({ regex: /<\|(.*?)\|>/ }));

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

        this.delimiterParser.on('data', (data) => {
            const payload = data.toString().trim();     
            console.log(`Received data via serial connection from DELIMITER: ${payload}`);  
        });

        this.regexParser.on('data', (data) => {
            const payload = data.toString();
            console.log(`Received data via serial connection from REGEX PARSER: ${payload}`);
            try {
                const jsonPayload = JSON.parse(payload);
                this.deviceStatus.next({ connected: true, ...jsonPayload });
            } catch(e) {
                console.log("Data received via serial connection is not valid Json");
            }
            
        });

        return this.deviceStatus;
        
    }

    closeConnection(): void {

        if (this.serialPort) {
        try {
            if (this.serialPort.isOpen) {
            console.log('Closing existing serial connection...');
            this.serialPort.close();
            }
        } catch (err) {
            console.error('Error closing serial port:', err);
        }
        this.serialPort.removeAllListeners();
        this.delimiterParser.removeAllListeners();
        this.regexParser.removeAllListeners();
        }

    }

}

export { SerialCom, DeviceStatus };