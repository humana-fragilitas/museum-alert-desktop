import { BrowserWindow, ipcMain, IpcMainEvent} from 'electron';
import { SerialPort } from 'serialport';
import { PortInfo } from '@serialport/bindings-cpp';
import { RegexParser } from '@serialport/parser-regex';
import { DelimiterParser } from '@serialport/parser-delimiter';
import { DeviceIncomingData, DeviceOutgoingData, DeviceEvent } from '../shared';
import { Subject } from 'rxjs';


class SerialCom {

    private serialPort?: SerialPort;
    private regexParser?: RegexParser;
    private delimiterParser?: DelimiterParser;
    
    public readonly device: Subject<PortInfo> = new Subject<PortInfo>();
    public readonly deviceConnectionStatus: Subject<boolean> = new Subject<boolean>();
    public readonly deviceIncomingData: Subject<DeviceIncomingData> = new Subject<DeviceIncomingData>();

    constructor(private browserWindow: BrowserWindow) {

        // Renderer to main process communication
        ipcMain.on(DeviceEvent.OUTGOING_DATA, (event: IpcMainEvent, payload: DeviceOutgoingData) => {
            this.sendDataToUSBDevice(payload);
        });

        // Main process to renderer communication
        this.device.subscribe((device: PortInfo) => {
            this.browserWindow.webContents.send(DeviceEvent.FOUND, device);
        });

        this.deviceConnectionStatus.subscribe((status: boolean) => {
            this.browserWindow.webContents.send(DeviceEvent.CONNECTION_STATUS_UPDATE, status);
        });

        this.deviceIncomingData.subscribe((data: DeviceIncomingData) => {   
            this.browserWindow.webContents.send(DeviceEvent.INCOMING_DATA, data);
        });

    }

    detectUSBDevice(manufacturer: string): Promise<PortInfo> {

        return new Promise((resolve) => {

            const interval = setInterval(() => {

                SerialPort.list().then((devices) => {
                
                    console.log(devices.length ?
                        `[Main process: SerialCom]: serial interfaces scanning found the following available ports: \n${JSON.stringify(devices)}` :
                            'serial interfaces scanning found no available ports');
                            
                    const device = devices.find((entry) => entry.manufacturer &&
                                                           entry.manufacturer.includes(manufacturer));
            
                    if (device) {
                        console.log(`[Main process: SerialCom]: found device: ${device.path} (${device.manufacturer})`);
                        clearInterval(interval);
                        resolve(device);
                    }

                }).catch((err) => {

                    console.error('[Main process: SerialCom]: error while scanning available serial interfaces:', err);

                });

            }, 1000);

        });

    }

    connectToUSBDevice(device: PortInfo): void {

        this.serialPort = new SerialPort({ path: device.path, baudRate: 9600 });
        this.delimiterParser = this.serialPort.pipe(new DelimiterParser({delimiter: '\n' }));
        this.regexParser = this.delimiterParser.pipe(new RegexParser({ regex: /<\|(.*?)\|>/ }));

        this.serialPort
            .on('open', () => {
                console.log(`[Main process: SerialCom]: opened serial connection with device ${device.path} (${device.manufacturer})`);
                this.deviceConnectionStatus.next(true);
            })
            .on('error', (error) => {
                console.error(`[Main process: SerialCom]: error while communicating via serial connection with device ${device.path} (${device.manufacturer}):`, error);
                this.deviceConnectionStatus.next(false);
            })
            .on('close', () => {      
                console.log(`[Main process: SerialCom]: closed serial connection with device ${device.path} (${device.manufacturer})`);
                this.deviceConnectionStatus.next(false);
            });

        this.delimiterParser.on('data', (data) => {
            const payload = data.toString().trim();     
            console.log(`[Main process: SerialCom]: received data via serial connection from DELIMITER PARSER: ${payload}`);  
        });

        this.regexParser.on('data', (data) => {
            const payload = data.toString();
            console.log(`[Main process: SerialCom]: received data (non-log message) via serial connection from REGEX PARSER: ${payload}`);
            try {
                const jsonPayload = JSON.parse(payload);
                this.deviceIncomingData.next({ ...jsonPayload });
            } catch(error) {
                console.log('[Main process: SerialCom]: data received via serial connection is not valid Json: ', error);
            }
        });
        
    }

    // Note: this method is currently unused
    closeConnection(): void {

        try {
            if (this.serialPort?.isOpen) {
            console.log('[Main process: SerialCom]: closing existing serial connection...');
            this.serialPort.close();
            }
        } catch (err) {
            console.error('[Main process: SerialCom]: error closing serial port:', err);
        }
        this.serialPort?.removeAllListeners();
        this.delimiterParser?.removeAllListeners();
        this.regexParser?.removeAllListeners();

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
                    console.log('[Main process: SerialCom]: device disconnected, restarting detection...');
                    deviceStatusSubscription.unsubscribe();
                    setTimeout(() => {
                        this.startDeviceDetection();
                    }, 1000);
                }

            });

            this.connectToUSBDevice(device);
      
          });
      
    }

    sendDataToUSBDevice(payload: DeviceOutgoingData) {

        this.serialPort?.write(payload, (err) => {

            if (err) {
                console.error('[Main process: SerialCom]: error while sending data to device:', err);
            } else {
                console.log(`[Main process: SerialCom]: sent data to device: ${payload}`);
            }

        });

    }

}

export default SerialCom;