// @flow

import path from 'path';
import os from 'os';

import { app } from '../electron'; // eslint-disable-line

export const locateZiCEConf = () => {
  if (os.platform() === 'darwin') {
    return path.join(app.getPath('appData'), 'ZiCE', 'zice.conf');
  }

  if (os.platform() === 'linux') {
    return path.join(app.getPath('home'), '.zice', 'zice.conf');
  }

  return path.join(app.getPath('appData'), 'ZiCE', 'zice.conf');
};
