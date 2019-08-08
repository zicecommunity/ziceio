// @flow

import { connect } from 'react-redux';
import eres from 'eres';
import flow from 'lodash.flow';
import groupBy from 'lodash.groupby';
import dateFns from 'date-fns';
import { BigNumber } from 'bignumber.js';

import { DashboardView } from '../views/dashboard';

import rpc from '../../services/api';
import store from '../../config/electron-store';
import { SAPLING, MIN_CONFIRMATIONS_NUMBER } from '../constants/zice-network';
import { NODE_SYNC_TYPES } from '../constants/node-sync-types';
import { zGetZTxsFromStore } from '../../services/shielded-transactions';
import { sortByDescend } from '../utils/sort-by-descend';

import {
  loadWalletSummary,
  loadWalletSummarySuccess,
  loadWalletSummaryError,
} from '../redux/modules/wallet';
import type { TransactionsList } from '../redux/modules/transactions';

import type { AppState } from '../types/app-state';
import type { Dispatch, FetchState } from '../types/redux';

export type MapStateToProps = {|
  total: number,
  shielded: number,
  transparent: number,
  unconfirmed: number,
  error: null | string,
  fetchState: FetchState,
  zcePrice: number,
  addresses: string[],
  transactions: TransactionsList,
  isDaemonReady: boolean,
|};

const mapStateToProps: AppState => MapStateToProps = ({ walletSummary, app }) => ({
  total: walletSummary.total,
  shielded: walletSummary.shielded,
  transparent: walletSummary.transparent,
  unconfirmed: walletSummary.unconfirmed,
  error: walletSummary.error,
  fetchState: walletSummary.fetchState,
  zcePrice: walletSummary.zcePrice,
  addresses: walletSummary.addresses,
  transactions: walletSummary.transactions,
  isDaemonReady: app.nodeSyncType === NODE_SYNC_TYPES.READY,
});

export type MapDispatchToProps = {|
  getSummary: () => Promise<void>,
|};

const mapDispatchToProps: (dispatch: Dispatch) => MapDispatchToProps = (dispatch: Dispatch) => ({
  getSummary: async () => {
    dispatch(loadWalletSummary());

    const [walletErr, walletSummary] = await eres(rpc.z_gettotalbalance());
    const [zAddressesErr, zAddresses = []] = await eres(rpc.z_listaddresses());
    const [tAddressesErr, tAddresses = []] = await eres(rpc.getaddressesbyaccount(''));
    const [transactionsErr, transactions] = await eres(rpc.listtransactions('', 10, 0));
    const [unconfirmedBalanceErr, unconfirmedBalance] = await eres(rpc.getunconfirmedbalance());

    if (walletErr || zAddressesErr || tAddressesErr || transactionsErr || unconfirmedBalanceErr) {
      return dispatch(
        loadWalletSummaryError({
          error: 'Something went wrong!',
        }),
      );
    }

    const tTxs = transactions.filter(t => t.address && (t.category === 'receive' || t.category === 'send')).map(e => {return {
      confirmations: e.confirmations,
      txid: e.txid,
      category: e.category,
      time: e.time,
      toaddress: e.address,
      amount: e.amount,
    }})

    const formatMemo = (m) => {
      m = m.replace(/[0]+$/,'')
      if (m === "f6") return ''
      m = m.replace(/(.{2})/g,'$1,').split(',').filter(Boolean).map(function (x) {return parseInt(x, 16)})
      return String.fromCharCode.apply(String, m)
    }

    const formattedTransactions: Array<Object> = flow([
      arr => arr.map(transaction => ({
        confirmations: typeof transaction.confirmations !== 'undefined'
          ? transaction.confirmations
          : 0,
        confirmed: typeof transaction.confirmations !== 'undefined'
          ? transaction.confirmations >= MIN_CONFIRMATIONS_NUMBER
          : true,
        transactionId: transaction.txid,
        type: transaction.category,
        date: new Date(transaction.time * 1000).toISOString(),
        fromaddress: transaction.fromaddress || '(Shielded)',
        toaddress: transaction.toaddress || '(Shielded)',
        amount: new BigNumber(transaction.amount).absoluteValue().toNumber(),
        fees: transaction.fee
          ? new BigNumber(transaction.fee).abs().toFormat(4)
          : 'N/A',
          isRead: transaction.isread,
          memo: transaction.memo
          ? formatMemo(transaction.memo)
          : ''
     })),
      arr => groupBy(arr, obj => dateFns.format(obj.date, 'MMM DD, YYYY')),
      obj => Object.keys(obj).map(day => ({
        day,
        jsDay: new Date(day),
        list: sortByDescend('date')(obj[day]),
      })),
      sortByDescend('jsDay'),
    ])(([...tTxs, ...await zGetZTxsFromStore(10)]
    .sort((a, b) => (a.time < b.time) ? 1 : -1))
      .slice(0, 10));

    if (!zAddresses.length) {
      const [, newZAddress] = await eres(rpc.z_getnewaddress(SAPLING));

      if (newZAddress) zAddresses.push(newZAddress);
    }

    if (!tAddresses.length) {
      const [, newTAddress] = await eres(rpc.getnewaddress(''));

      if (newTAddress) tAddresses.push(newTAddress);
    }

    dispatch(
      loadWalletSummarySuccess({
        transparent: walletSummary.transparent,
        total: walletSummary.total,
        shielded: walletSummary.private,
        unconfirmed: unconfirmedBalance,
        addresses: [...zAddresses, ...tAddresses],
        transactions: formattedTransactions,
        zcePrice: new BigNumber(store.get('ZCE_DOLLAR_PRICE')).toNumber(),
      }),
    );
  },
});

// $FlowFixMe
export const DashboardContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
)(DashboardView);
