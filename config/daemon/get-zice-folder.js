// @flow
import os from 'os';
import path from 'path';
import electron from 'electron'; // eslint-disable-line

export const getZiCEFolder = () => {
  const { app } = electron;

  if (os.platform() === 'darwin') {
    return path.join(app.getPath('appData'), 'ZiCE');
  }

  if (os.platform() === 'linux') {
    return path.join(app.getPath('home'), '.zice');
  }

  return path.join(app.getPath('appData'), 'ZiCE');
};
