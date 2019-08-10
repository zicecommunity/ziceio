// @flow

import eres from 'eres';
import { connect } from 'react-redux';
import { BigNumber } from 'bignumber.js';
import axios from 'axios'

import { TransactionsView } from '../views/transactions';
import {
  loadTransactions,
  loadTransactionsSuccess,
  loadTransactionsError,
  resetTransactionsList,
} from '../redux/modules/transactions';
import rpc from '../../services/api';
import { zGetZTxsFromStore } from '../../services/shielded-transactions';
import store from '../../config/electron-store';
import { MIN_CONFIRMATIONS_NUMBER } from '../constants/zice-network';

import { sortByDescend } from '../utils/sort-by-descend';

import type { AppState } from '../types/app-state';
import type { Dispatch } from '../types/redux';
import type { Transaction } from '../components/transaction-item';

const mapStateToProps = ({ transactions }: AppState) => ({
  transactions: transactions.list,
  fetchState: transactions.fetchState,
  error: transactions.error,
  zcePrice: transactions.zcePrice,
  hasNextPage: transactions.hasNextPage,
});

export type MapStateToProps = {
  transactions: Transaction[],
  isLoading: boolean,
  error: string | null,
  zcePrice: number,
  hasNextPage: boolean,
};

export type MapDispatchToProps = {|
  getTransactions: ({
    offset: number,
    count: number,
    shieldedTransactionsCount: number,
  }) => Promise<void>,
  resetTransactionsList: () => void,
|};

const mapDispatchToProps = (dispatch: Dispatch): MapDispatchToProps => ({
  resetTransactionsList: () => dispatch(resetTransactionsList()),
  getTransactions: async ({ offset, count, shieldedTransactionsCount }) => {
    dispatch(loadTransactions());

    const [transactionsErr, transactions = []] = await eres(
      rpc.listtransactions('', 1000, 0),
    );

    if (transactionsErr) {
      return dispatch(loadTransactionsError({ error: transactionsErr.message }));
    }

    const tTxs = transactions.filter(t => t.category === 'receive' || t.category === 'send').map(e => {return {
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

    let currentHeight
    try {
      currentHeight = (await axios.get('http://192.168.0.221:9080/getinfo')).data.blocks
    } catch (error) {
      console.error(error);
    }

    const formattedTransactions = sortByDescend('date')(
      [
        ...tTxs,
        ...await zGetZTxsFromStore(1000),
      ].map(transaction => ({
        confirmations: transaction.confirmations > 0
          ? transaction.confirmations
          : currentHeight - transaction.blockheight,
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
    );

    dispatch(
      loadTransactionsSuccess({
        list: formattedTransactions,
        zcePrice: new BigNumber(store.get('ZCE_DOLLAR_PRICE')).toNumber(),
        hasNextPage: Boolean(formattedTransactions.length),
      }),
    );
  },
});

// $FlowFixMe
export const TransactionsContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
)(TransactionsView);
