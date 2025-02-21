import { Injectable } from '@angular/core';
import { BleClient, ScanResult, numberToUUID } from '@capacitor-community/bluetooth-le';
import { Platform } from '@ionic/angular';


@Injectable({
  providedIn: 'root'
})
export class BluetoothService {

  readonly devices:ScanResult[];

  isEnabled: boolean = false;

  constructor(private platform: Platform) {

    this.devices = [];

    console.log('BluetoothService created!');

  }

  async scanDevices() {
    
    try {

      //if (navigator.userActivation.isActive) {

      if (this.platform.is('android')) {
        const isLocationEnabled = await BleClient.isLocationEnabled();
        if (!isLocationEnabled) {
          await BleClient.openLocationSettings();
        }
      }

      await BleClient.initialize({ androidNeverForLocation: true });
      this.isEnabled = await BleClient.isEnabled();
      // Only supported on Android
      //if (this.isEnabled) BleClient.requestEnable();

      console.log('Started scan!');

      await BleClient.requestLEScan({
        allowDuplicates: false
      },
        (result: ScanResult) => {

          this.devices.push(result);

        }
      );
  
      setTimeout(async () => this.stopScanning(), 10000);

    } catch (error) {

      console.error('Can\'t scan BLE...', error);

    }

  }

  async stopScanning() {

    await BleClient.stopLEScan();
    this.devices.length = 0;
    console.log('stopped scanning');

  }

  async connect(deviceId: string) {

    // https://github.com/capacitor-community/bluetooth-le?tab=readme-ov-file#troubleshooting
    
    await BleClient.disconnect(deviceId);
    await BleClient.connect(deviceId);

  }

}
