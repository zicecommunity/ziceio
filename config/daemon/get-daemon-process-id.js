// @flow
import fs from 'fs';
import path from 'path';
import { getZiCEFolder } from './get-zice-folder';

const ZICE_PID_FILE = 'ziced.pid';

export const getDaemonProcessId = (zicePath?: string) => {
  try {
    const myPath = zicePath || getZiCEFolder();
    const buffer = fs.readFileSync(path.join(myPath, ZICE_PID_FILE));
    const pid = Number(buffer.toString().trim());
    return pid;
  } catch (err) {
    return null;
  }
};
