import * as path from 'path';
import * as fs from 'fs';

import { app,
         BrowserWindow,
         screen,
         Menu,
         MenuItemConstructorOptions,
         dialog,
         powerMonitor,
         ipcMain } from 'electron';

import SerialCom from './core/serial-com.service';
import { MainProcessEvent } from './shared';

let win: BrowserWindow | null = null;
const args = process.argv.slice(1),
      serve = args.some(val => val === '--serve');

let serialCom: SerialCom;

function createWindow(): BrowserWindow {

  const size = screen.getPrimaryDisplay().workAreaSize;

  // Create the browser window
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    webPreferences: {
      nodeIntegration: false,
      allowRunningInsecureContent: serve,
      webSecurity: !serve,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  setApplicationMenu();

  if (serve) {
    import('electron-debug').then(debug => {
      debug.default({isEnabled: true, showDevTools: true});
    });

    import('electron-reloader').then(reloader => {
      const reloaderFn = (reloader as any).default || reloader;
      reloaderFn(module);
    });
    win.loadURL('http://localhost:4200');

  } else {

    // Path when running electron executable
    let pathIndex = './index.html';

    if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
       // Path when running electron in local folder
      pathIndex = '../dist/index.html';
    }

    const fullPath = path.join(__dirname, pathIndex);
    const url = `file://${path.resolve(fullPath).replace(/\\/g, '/')}`;
    win.loadURL(url);
  }

  // Emitted when the window is closed
  win.on('closed', () => {
    /**
     * Dereference the window object, usually you would store window
     * in an array if your app supports multi windows, this is the time
     * when you should delete the corresponding element
     */
    win = null;
  });

  return win;

}

try {

  /**
   * This handler will be called when Electron has finished
   * initialization and is ready to create browser windows;
   * some APIs can only be used after this event occurs.
   * Added 400 ms to fix the black background issue while
   * using transparent window.
   * More detais at https://github.com/electron/electron/issues/15947
   */
  app.on('ready', () => setTimeout(() => {

    const mainWindow = createWindow();

    mainWindow.on('focus', () => {
      console.log('[Main process]: window focused');
      mainWindow.webContents.send(MainProcessEvent.WINDOW_FOCUSED);
    });

    setInterval(() => {
      mainWindow.webContents.send(MainProcessEvent.SESSION_CHECK);
    }, 1000);

    powerMonitor.on('suspend', () => {
      console.log('[Main process]: system is suspending');
      mainWindow.webContents.send(MainProcessEvent.SYSTEM_SUSPENDED);
    });

    powerMonitor.on('resume', () => {
      console.log('[Main process]: system is resuming');
      mainWindow.webContents.send(MainProcessEvent.SYSTEM_RESUMED);
    });

    new SerialCom(mainWindow).startDeviceDetection();

    /**
     * Place here any handlers suitable for renderer to main
     * process communication; e.g.:
     * ipcMain.on('hello', () => {
     *   console.log('[Main process]: hello from Angular app!');
     * });
     */

  }, 400));

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    /**
     * On OS X it is common for applications and their menu bar
     * to stay active until the user quits explicitly with Cmd + Q
     */
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    /**
     * On OS X it's common to re-create a window in the app when the
     * dock icon is clicked and there are no other windows open
     */
    if (win === null) {
      createWindow();
    }
  });

} catch (e) {
  
  if (serve) {
    // Development: show detailed error and don't quit
    console.error('[Dev Mode]: App will continue running for debugging');
    if (app.isReady()) {
      const { dialog } = require('electron');
      dialog.showErrorBox('Development Error', `${e instanceof Error ? e.stack : String(e)}`);
    }
  } else {
    // Production: show user-friendly error and quit
    if (app.isReady()) {
      dialog.showErrorBox('Application Error', 'Failed to start Museum Alert App.');
    }
    app.quit();
  }

}

function setApplicationMenu() {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'togglefullscreen' },
        ...(serve ? [
          { type: 'separator' },
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' }
        ] : [])
      ] as MenuItemConstructorOptions[]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  
}