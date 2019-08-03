// @flow
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import eres from 'eres';

import { getZiCEFolder } from './get-zice-folder';

const ZICE_LOCK_FILE = '.lock';

export const checkLockFile = async (zicePath?: string) => {
  try {
    const myPath = zicePath || getZiCEFolder();
    const [cannotAccess] = await eres(promisify(fs.access)(path.join(myPath, ZICE_LOCK_FILE)));
    return !cannotAccess;
  } catch (err) {
    return false;
  }
};
