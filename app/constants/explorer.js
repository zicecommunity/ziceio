// @flow

import { isTestnet } from '../../config/is-testnet';

export const ZICE_EXPLORER_BASE_URL = isTestnet()
  ? 'https://chain.so/tx/ZCETEST/'
  : 'https://zcha.in/transactions/';
