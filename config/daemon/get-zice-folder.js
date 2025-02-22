// @flow
import os from 'os';
import path from 'path';
import electron from 'electron'; // eslint-disable-line

export const getZiCEFolder = () => {
  const { app } = electron;

  if (os.platform() === 'darwin') {
    return path.join(app.getPath('appData'), 'ZiCEio');
  }

  if (os.platform() === 'linux') {
    return path.join(app.getPath('home'), '.ziceio');
  }

  return path.join(app.getPath('appData'), 'ZiCEio');
};
