// @flow

import electronStore from './electron-store';
import { ZICE_NETWORK, MAINNET } from '../app/constants/zice-network';

export const isTestnet = () => electronStore.get(ZICE_NETWORK) !== MAINNET;
