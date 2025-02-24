import {app, BrowserWindow, screen, ipcMain} from 'electron';
import { SerialPort } from 'serialport';
import { RegexParser } from '@serialport/parser-regex';
import * as path from 'path';
import * as fs from 'fs';

let win: BrowserWindow | null = null;
const args = process.argv.slice(1),
  serve = args.some(val => val === '--serve');

let serialPort: SerialPort;

function createWindow(): BrowserWindow {

  const size = screen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      allowRunningInsecureContent: (serve),
      contextIsolation: true,
    },
  });

  if (serve) {
    const debug = require('electron-debug');
    debug();

    require('electron-reloader')(module);
    win.loadURL('http://localhost:4200');
  } else {
    // Path when running electron executable
    let pathIndex = './index.html';

    if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
       // Path when running electron in local folder
      pathIndex = '../dist/index.html';
    }

    const url = new URL(path.join('file:', __dirname, pathIndex));
    win.loadURL(url.href);
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

 initialize(win);

  return win;
}

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.on('ready', () => setTimeout(createWindow, 400));

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

} catch (e) {
  // Catch Error
  // throw e;
}

function initialize(win: BrowserWindow) {

    /**
     * list serial port on a MAC
     * ls /dev/tty.*
     * ls /dev/cu.*
     */

    // Open the serial port (adjust COM port for your system)
    serialPort = new SerialPort({
      path: '/dev/cu.usbmodem3485187A35EC2', // Change this to match your Arduino port (e.g., "/dev/ttyUSB0" for Linux)
      //path: '/dev/tty.usbmodem3485187A35EC2',
      baudRate: 9600
    });

    const parser = serialPort.pipe(new RegexParser({ regex: /<\|(.*?)\|>/ }));

    open();

    serialPort.on('close', attemptReconnect);
    serialPort.on('error', (err) => {
      console.error('Serial Port Error:', err.message);
      attemptReconnect();
    });

    serialPort.on('data', (data) => {
      console.log('Serial port received data:', data.toString());
      win.webContents.send('main-to-renderer', data.toString('utf-8'));
    });  

    parser.on('data', (data) => {
      console.log('Parser received data:', data.toString());
      win.webContents.send('main-to-renderer', data.toString('utf-8'));
    });
  
    ipcMain.on('renderer-to-main', (event, message) => {
      console.log('Message from renderer:', message);  
      // serialPort.write(message, (err) => {
      //   if (err) {
      //     console.error('Error writing to serial port:', err.message);
      //   }
      // });
    });

    win.webContents.send('main-to-renderer', 'Hello from main.ts');

    function attemptReconnect() {

      open();

    }

    function open() {

      serialPort.on('open', () => {
        console.log('Serial Port Opened');
        setInterval(() => {
          serialPort.write('ciao', (err) => {
            if (err) {
              console.error('Error writing to serial port:', err.message);
            } else {
              console.log('Message sent successfully!');
            }
          });
        }, 5000);  
      });
      
    }

}

