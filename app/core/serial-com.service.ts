import {app, BrowserWindow, ipcMain} from 'electron';
import { SerialPort } from 'serialport';
import { PortInfo } from '@serialport/bindings-cpp';
import { RegexParser } from '@serialport/parser-regex';
import { DelimiterParser } from '@serialport/parser-delimiter';
import { DeviceIncomingData, DeviceAppState, DeviceMessageType } from '@shared/models';
import { Subject } from 'rxjs';

// {"path":"/dev/tty.usbmodem3485187A35EC2","manufacturer":"Arduino","serialNumber":"3485187A35EC","locationId":"00100000","vendorId":"2341","productId":"0070"}
class SerialCom {

    private serialPort!: SerialPort;
    private regexParser!: RegexParser;
    private delimiterParser!: DelimiterParser;
    
    public readonly device: Subject<PortInfo> = new Subject<PortInfo>();
    public readonly deviceConnectionStatus: Subject<boolean> = new Subject<boolean>();
    public readonly deviceIncomingData: Subject<DeviceIncomingData> = new Subject<DeviceIncomingData>();

    constructor(private browserWindow: BrowserWindow) {

        // Renderer to main process IPC communication
        ipcMain.on('start-device-detection', () => {
            this.startDeviceDetection();
        });

        ipcMain.on('close-serial-connection', () => {
            this.closeConnection();
        });

        // Main to renderer process IPC communication
        this.device.subscribe((device: PortInfo) => {
            this.browserWindow.webContents.send('device-found', device);
        });

        this.deviceConnectionStatus.subscribe((status: boolean) => {
            this.browserWindow.webContents.send('device-connection-status-update', status);
        });

        this.deviceIncomingData.subscribe((data: DeviceIncomingData) => {   
            this.browserWindow.webContents.send('device-incoming-data', data);
        });

    }

    detectUSBDevice(manufacturer: string): Promise<PortInfo> {

        return new Promise((resolve) => {

            const interval = setInterval(() => {

                SerialPort.list().then((devices) => {
                
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

    connectToUSBDevice(device: PortInfo): void {

        this.serialPort = new SerialPort({ path: device.path, baudRate: 9600 });
        this.delimiterParser = this.serialPort.pipe(new DelimiterParser({delimiter: '\n' }));
        this.regexParser = this.delimiterParser.pipe(new RegexParser({ regex: /<\|(.*?)\|>/ }));

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
                this.deviceIncomingData.next({ ...jsonPayload });
            } catch(e) {
                console.log("Data received via serial connection is not valid Json");
            }
            
        });
        
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

    startDeviceDetection() {
      
        /**
         * In a real-world application, you would want to specify your
         * actual manufacturer name here. For the sake of this example,
         * we are using 'Arduino' as the manufacturer name.
         */
      
        this.detectUSBDevice('Arduino').then((device: PortInfo) => {
      
            this.device.next(device);

            const deviceStatusSubscription = this.deviceConnectionStatus.subscribe((status: boolean) => {

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

export { SerialCom,
         DeviceIncomingData,
         DeviceAppState, 
         DeviceMessageType };