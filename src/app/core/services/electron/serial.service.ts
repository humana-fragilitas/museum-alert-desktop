import { Injectable } from '@angular/core';

declare global {
    interface Window {
    electron?: {
        ipcRenderer: {
            send: (channel: string, data?: any) => void;
            on: (channel: string, callback: (data: any) => void) => void;
            removeAllListeners: (channel: string) => void;
            };
        };
    }
}


@Injectable({
  providedIn: 'root'
})
export class SerialService {

  isEnabled: boolean = false;

  constructor() {

    console.log('SerialService created!');

    if (window.electron) {

        window.electron.ipcRenderer.on('main-to-renderer', (data) => {
            console.log('Received:', data);
        });

        window.electron.ipcRenderer.send('renderer-to-main', { msg: 'Hello from Angular!' });
        
    }

  }

  async scanPorts(): Promise<string[]> {
    return [];
  }

}
