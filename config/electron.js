// @flow

import '@babel/polyfill';
import dotenv from 'dotenv';

import path from 'path';

/* eslint-disable import/no-extraneous-dependencies */
import {
  app, BrowserWindow, typeof BrowserWindow as BrowserWindowType, Menu,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import isDev from 'electron-is-dev';
import { registerDebugShortcut } from '../utils/debug-shortcut';
import runDaemon from './daemon/ziced-child-process';
import { log as ziceLog, cleanLogs } from './daemon/logger';
import getZcePrice from '../services/zce-price';
import store from './electron-store';
import { handleDeeplink } from './handle-deeplink';
import { MENU } from '../app/menu';

dotenv.config();

let mainWindow: BrowserWindowType;
let updateAvailable: boolean = false;
let ziceDaemon;

const showStatus = (text) => {
  if (text === 'Update downloaded') updateAvailable = true;

  if (mainWindow) {
    mainWindow.webContents.send('update', {
      updateAvailable,
      updateInfo: text,
    });
  }
};

const createWindow = () => {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('checking-for-update', () => showStatus('Checking for update'));
  autoUpdater.on('update-available', () => showStatus('Update available'));
  autoUpdater.on('update-not-available', () => showStatus('No updates available'));
  autoUpdater.on('error', err => showStatus(`Error while updating: ${err}`));

  autoUpdater.on('download-progress', progress => showStatus(
    /* eslint-disable-next-line max-len */
    `Download speed: ${progress.bytesPerSecond} - Downloaded ${progress.percent}% (${
      progress.transferred
    }/${progress.total})`,
  ));

  autoUpdater.on('update-downloaded', () => {
    updateAvailable = true;
    showStatus('Update downloaded');
  });

  mainWindow = new BrowserWindow({
    minWidth: 815,
    minHeight: 600,
    width: 1000,
    height: 660,
    transparent: false,
    frame: true,
    resizable: true,
    webPreferences: {
      devTools: true,
      webSecurity: true,
    },
  });

  // mainWindow.webContents.openDevTools();
  
  getZcePrice().then(({ USD }) => store.set('ZCE_DOLLAR_PRICE', String(USD)));

  mainWindow.setVisibleOnAllWorkspaces(true);
  registerDebugShortcut(app, mainWindow);

  mainWindow.loadURL(
    isDev ? 'http://localhost:8080/' : `file://${path.join(__dirname, '../build/index.html')}`,
  );

  Menu.setApplicationMenu(Menu.buildFromTemplate(MENU));

  exports.app = app;
  exports.mainWindow = mainWindow;
};

app.setAsDefaultProtocolClient('zice');

const instanceLock = app.requestSingleInstanceLock();
if (instanceLock) {
  app.on('second-instance', (event: Object, argv: string[]) => {
    handleDeeplink({
      app,
      mainWindow,
      argv,
      listenOpenUrl: false,
    });

    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();
    }
  });
} else {
  app.quit();
}

handleDeeplink({ app, mainWindow });

/* eslint-disable-next-line consistent-return */
app.on('ready', async () => {
  createWindow();

  console.log('[Process Argv]', process.argv); // eslint-disable-line

  // Reset old logs on startup
  cleanLogs();

  if (process.env.NODE_ENV === 'test') {
    ziceLog('Not running daemon, please run the mock API');
    return;
  }

  runDaemon()
    .then((proc) => {
      if (proc) {
        ziceLog(`ZiCE Daemon running. PID: ${proc.pid}`);
        ziceDaemon = proc;
      }
    })
    .catch(ziceLog);
});
app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => {
  if (ziceDaemon) {
    ziceLog('Graceful shutdown ZiCE Daemon, this may take a few seconds.');
    ziceDaemon.kill('SIGINT');
  }
});
