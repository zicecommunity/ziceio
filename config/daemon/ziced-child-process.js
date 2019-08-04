// @flow

import cp from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
/* eslint-disable import/no-extraneous-dependencies */
import isDev from 'electron-is-dev';
import type { ChildProcess } from 'child_process';
import eres from 'eres';
import uuid from 'uuid/v4';
import findProcess from 'find-process';

/* eslint-disable-next-line import/named */
import { mainWindow } from '../electron';
import waitForDaemonClose from './wait-for-daemon-close';
import getBinariesPath from './get-binaries-path';
import getOsFolder from './get-os-folder';
import getDaemonName from './get-daemon-name';
import fetchParams from './run-fetch-params';
import { locateZiCEConf } from './locate-zice-conf';
import { log } from './logger';
import store from '../electron-store';
import { parseZiCEConf, parseCmdArgs, generateArgsFromConf } from './parse-zice-conf';
import { isTestnet } from '../is-testnet';
import { getDaemonProcessId } from './get-daemon-process-id';
import {
  EMBEDDED_DAEMON,
  ZICE_NETWORK,
  TESTNET,
  MAINNET,
} from '../../app/constants/zice-network';

const getDaemonOptions = ({
  username, password, useDefaultZiCEConf, optionsFromZiCEConf,
}) => {
  /*
    -showmetrics
        Show metrics on stdout
    -metricsui
        Set to 1 for a persistent metrics screen, 0 for sequential metrics
        output
    -metricsrefreshtime
        Number of seconds between metrics refreshes
  */

  const defaultOptions = [
    '-server=1',
    '-showmetrics=1',
    '-metricsui=0',
    '-metricsrefreshtime=1',
    `-rpcuser=${username}`,
    `-rpcpassword=${password}`,
    ...(isTestnet() ? ['-testnet', '-addnode=testnet.z.cash'] : ['-addnode=mainnet.z.cash']),
    // Overwriting the settings with values taken from "zice.conf"
    ...optionsFromZiCEConf,
  ];

  if (useDefaultZiCEConf) defaultOptions.push(`-conf=${locateZiCEConf()}`);

  return Array.from(new Set([...defaultOptions, ...optionsFromZiCEConf]));
};

let resolved = false;

const ZICED_PROCESS_NAME = getDaemonName();
const DAEMON_PROCESS_PID = 'DAEMON_PROCESS_PID';
const DAEMON_START_TIME = 'DAEMON_START_TIME';

let isWindowOpened = false;

const sendToRenderer = (event: string, message: Object, shouldLog: boolean = true) => {
  if (shouldLog) {
    log(message);
  }

  if (isWindowOpened) {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(event, message);
    }
  } else {
    const interval = setInterval(() => {
      if (isWindowOpened) {
        mainWindow.webContents.send(event, message);
        clearInterval(interval);
      }
    }, 1000);
  }
};

// eslint-disable-next-line
const runDaemon: () => Promise<?ChildProcess> = () => new Promise(async (resolve, reject) => {
  mainWindow.webContents.on('dom-ready', () => {
    isWindowOpened = true;
  });
  store.delete('rpcconnect');
  store.delete('rpcport');
  store.delete(DAEMON_PROCESS_PID);
  store.delete(DAEMON_START_TIME);

  const processName = path.join(getBinariesPath(), getOsFolder(), ZICED_PROCESS_NAME);
  const isRelaunch = Boolean(process.argv.find(arg => arg === '--relaunch'));

  if (!mainWindow.isDestroyed()) mainWindow.webContents.send('ziced-params-download', 'Fetching params...');

  sendToRenderer('zice-daemon-status', {
    error: false,
    status:
        'Downloading network params, this may take some time depending on your connection speed',
  });

  const [err] = await eres(fetchParams());

  if (err) {
    sendToRenderer('zice-daemon-status', {
      error: true,
      status: `Error while fetching params: ${err.message}`,
    });

    return reject(new Error(err));
  }

  sendToRenderer('zice-daemon-status', {
    error: false,
    status: 'ZiCEio Starting',
  });

  // In case of --relaunch on argv, we need wait to close the old zice daemon
  // a workaround is use a interval to check if there is a old process running
  if (isRelaunch) {
    await waitForDaemonClose(ZICED_PROCESS_NAME);
  }

  // This will parse and save rpcuser and rpcpassword in the store
  let [, optionsFromZiCEConf] = await eres(parseZiCEConf());

  // if the user has a custom datadir and doesn't have a zice.conf in that folder,
  // we need to use the default zice.conf
  let useDefaultZiCEConf = false;

  if (optionsFromZiCEConf.datadir) {
    const hasDatadirConf = fs.existsSync(path.join(optionsFromZiCEConf.datadir, 'zice.conf'));

    if (hasDatadirConf) {
      optionsFromZiCEConf = await parseZiCEConf(
        path.join(String(optionsFromZiCEConf.datadir), 'zice.conf'),
      );
    } else {
      useDefaultZiCEConf = true;
    }
  }

  if (optionsFromZiCEConf.rpcconnect) store.set('rpcconnect', optionsFromZiCEConf.rpcconnect);
  if (optionsFromZiCEConf.rpcport) store.set('rpcport', optionsFromZiCEConf.rpcport);
  if (optionsFromZiCEConf.rpcuser) store.set('rpcuser', optionsFromZiCEConf.rpcuser);
  if (optionsFromZiCEConf.rpcpassword) store.set('rpcpassword', optionsFromZiCEConf.rpcpassword);

  log('Searching for ziced.pid');
  const daemonProcessId = getDaemonProcessId(optionsFromZiCEConf.datadir);

  if (daemonProcessId) {
    store.set(EMBEDDED_DAEMON, false);
    log(
      // eslint-disable-next-line
        `A daemon was found running in PID: ${daemonProcessId}. Starting ZiCEio in external daemon mode.`,
    );

    // Command line args override zice.conf
    const [{ cmd, pid }] = await findProcess('pid', daemonProcessId);

    store.set(DAEMON_PROCESS_PID, pid);

    // We need grab the rpcuser and rpcpassword from either process args or zice.conf
    const {
      rpcuser, rpcpassword, rpcconnect, rpcport, testnet: isTestnetFromCmd,
    } = parseCmdArgs(
      cmd,
    );

    store.set(
      ZICE_NETWORK,
      isTestnetFromCmd === '1' || optionsFromZiCEConf.testnet === '1' ? TESTNET : MAINNET,
    );

    if (rpcuser) store.set('rpcuser', rpcuser);
    if (rpcpassword) store.set('rpcpassword', rpcpassword);
    if (rpcport) store.set('rpcport', rpcport);
    if (rpcconnect) store.set('rpcconnect', rpcconnect);

    return resolve();
  }

  log(
    "ZiCEio couldn't find a `ziced.pid`, that means there is no instance of zice running on the machine, trying start built-in daemon",
  );

  store.set(EMBEDDED_DAEMON, true);

  if (!isRelaunch) {
    store.set(ZICE_NETWORK, optionsFromZiCEConf.testnet === '1' ? TESTNET : MAINNET);
  }

  if (!optionsFromZiCEConf.rpcuser) store.set('rpcuser', uuid());
  if (!optionsFromZiCEConf.rpcpassword) store.set('rpcpassword', uuid());

  const rpcCredentials = {
    username: store.get('rpcuser'),
    password: store.get('rpcpassword'),
  };

  if (isDev) log('Rpc Credentials', rpcCredentials);

  const childProcess = cp.spawn(
    processName,
    getDaemonOptions({
      ...rpcCredentials,
      useDefaultZiCEConf,
      optionsFromZiCEConf: generateArgsFromConf(optionsFromZiCEConf),
    }),
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  store.set(DAEMON_PROCESS_PID, childProcess.pid);

  childProcess.stdout.on('data', (data) => {
    if (!resolved) {
      store.set(DAEMON_START_TIME, Date.now());
      resolve(childProcess);
      resolved = true;
    }
  });

  childProcess.stderr.on('data', (data) => {
    log(data.toString());
    reject(new Error(data.toString()));
  });

  childProcess.on('error', reject);

  if (os.platform() === 'win32') {
    resolved = true;
    resolve(childProcess);
  }
});

// eslint-disable-next-line
export default runDaemon;
