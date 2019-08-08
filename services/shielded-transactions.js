// @flow
import eres from 'eres';
import rpc from '../services/api';
import * as Sql from '../app/utils/sqlite'


type ShieldedTransaction = {|
  txid: string,
  category: 'send' | 'receive',
  time: number,
  address: string,
  amount: number,
  memo: ?string,
|};

type ShieldedAddressLabel = {|
  label: string,
  address: string,
|};

let zReceivedByTransactions = [];

const zListReceivedByAddressAll = (async (blockheight) => {
  const [zAddressesErr, zAddresses = []] = await eres(rpc.z_listaddresses());

  const zSendTransactions = await Sql.sqlCommand('SELECT * FROM opid WHERE category = "send"')

  console.log('zSendTransactions')
  console.log(zSendTransactions)

  if (zAddressesErr) {
    return dispatch(
      loadWalletSummaryError({
        error: 'Something went wrong!',
      }),
    );
  }

  zReceivedByTransactions=[]
  for (let zAddr of zAddresses) {
    let txZAddr;
    let zSendAddr;
    const [receivedErr, zListReceivedByAddress] = await eres(rpc.z_listreceivedbyaddress(zAddr))

    if (receivedErr) {
      return dispatch(
        loadWalletSummaryError({
          error: 'Something went wrong!',
        }),
      );
    }

    for (txZAddr of zListReceivedByAddress) {
      const [txErr, txTime] = await eres(rpc.gettransaction(txZAddr.txid))
      const [txBlockErr, txBlock] = await eres(rpc.getblock(txTime.blockhash))

      // console.log('txBlock')
      // console.log(txBlock)
      // console.log('txTime')
      // console.log(txTime)

      if (txErr || txBlockErr) {
        return dispatch(
          loadWalletSummaryError({
            error: 'Something went wrong!',
          }),
        );
      }

      // find send address of any local tx
      zSendAddr = zSendTransactions.find(z => z.txid === txZAddr.txid) || ''

      //basic filter to add only non-change addresses to list
      if (!zSendTransactions.some(z => (z.fromaddress === zAddr && z.txid === txZAddr.txid && z.amount !== txZAddr.amount)))
      {
        zReceivedByTransactions.push({
          height: txBlock.height,
          confirmations: txTime.confirmations,
          txid: txZAddr.txid,
          category: "receive",
          time: txTime.time,
          fromaddress: zSendAddr.fromaddress || '(Shielded)',
          toaddress: zAddr,
          amount: txZAddr.amount,
          memo: txZAddr.memo,
        })
      }
    }
  }

  // only need 'new' transactions after the last recorded blockheight
  const zSendTxSince = zReceivedByTransactions.filter(t => t.height > (blockheight))

  //group notes to give single total for address
  // return ( await Object.values([...zReceivedByTransactions]
  return ( await Object.values([...zSendTxSince]
      .reduce((tx, { height, confirmations, txid, category, time, toaddress, fromaddress, memo, amount }) => {
    tx[txid] = { height, confirmations, txid, category, time, toaddress, fromaddress, memo, amount : (tx[txid] ? tx[txid].amount : 0) + amount  };
    return tx;
  }, {})));
})

export const zGetZTxsFromStore = async (count) => {
  return await Sql.sqlCommand('SELECT * FROM opid')
}

export const updateShieldedTransactions = async (blockheight) => {

  const trans = (await zListReceivedByAddressAll(blockheight)).sort((a, b) => (a.time < b.time) ? 1 : -1)

  for (let t in trans) {
    await Sql.insertRow(
      'opid',
      [
        trans[t].time,
        trans[t].category,
        trans[t].toaddress,
        trans[t].amount,
        trans[t].fromaddress,
        trans[t].txid,
        trans[t].memo,
        0,
        trans[t].height
      ]
    )
  }
};
