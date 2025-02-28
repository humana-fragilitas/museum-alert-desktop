import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SerialService {

  isEnabled: boolean = false;

  constructor() {

    console.log('SerialService created!');

    if (window.electron) {
      
      window.electron.ipcRenderer.on('device-found', (data) => {
        console.log('[ANGULAR APP] Device found:', data);
      });
  
      window.electron.ipcRenderer.on('device-connection-status-update', (data) => {
        console.log('[ANGULAR APP] Device connection status update:', data);
      });

      window.electron.ipcRenderer.on('device-incoming-data', (data) => {
        console.log('[ANGULAR APP] Device incoming data:', data);
      });

    }

    // Example: send data to main process
    // window.electron!.ipcRenderer.send('renderer-to-main', { msg: 'Hello from Angular!' });
        
  }

}
