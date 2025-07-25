import { ipcRenderer, webFrame } from 'electron';
import * as childProcess from 'child_process';
import * as fs from 'fs';

import { Inject, Injectable } from '@angular/core';

import { WINDOW } from '@tokens/window';


@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  
  ipcRenderer!: typeof ipcRenderer;
  webFrame!: typeof webFrame;
  childProcess!: typeof childProcess;
  fs!: typeof fs;

  constructor(@Inject(WINDOW) private win: Window) {

    // Conditional imports
    if (this.isElectron) {

      this.ipcRenderer = (win as any).require('electron').ipcRenderer;
      this.webFrame = (win as any).require('electron').webFrame;

      this.fs = (win as any).require('fs');

      this.childProcess = (win as any).require('child_process');
      this.childProcess.exec('node -v', (error, stdout, stderr) => {
        if (error) {
          console.error(`[ElectronService]: error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`[ElectronService]: stderr: ${stderr}`);
          return;
        }
        console.log(`[ElectronService]: stdout:\n${stdout}`);
      });

      /**
       * Note: A NodeJS's dependency imported with 'window.require' must be present in `dependencies`
       * of both `app/package.json` and `package.json (root folder)` in order to make it work here 
       * in Electron's Renderer process (src folder) because it will loaded at runtime by Electron.
       * A NodeJS's dependency imported with TS module import (ex: import { Dropbox } from 'dropbox')
       * CAN only be present in `dependencies` of `package.json (root folder)` because it is loaded 
       * during build phase and does not need to be in the final bundle. Reminder : only if not used
       * in Electron's Main process (app folder). If you want to use a NodeJS 3rd party deps in
       * Renderer process, ipcRenderer.invoke can serve many common use cases.
       * Ref.: https://www.electronjs.org/docs/latest/api/ipc-renderer#ipcrendererinvokechannel-args
       */ 

    }

  }

  get isElectron(): boolean {
    return !!(this.win && this.win.process && this.win.process.type);
  }

}
