import sqlite from 'sqlite';
import eres from 'eres';
import rpc from '../../services/api';
import { updateShieldedTransactions } from '../../services/shielded-transactions';

const updateStatus = async () => {
 
  // await updateShieldedTransactions(6602)

  console.log('updateStatus')
  const [txBlockErr, txBlock] = await eres(rpc.getinfo())
  console.log(txBlock.blocks)
  console.log(await selectItem('system'))
  let lastzheight = await selectItem('system')
  if (lastzheight < txBlock.blocks) {
    console.log('lastzheight < txBlock.blocks')
    console.log(lastzheight, txBlock.blocks)
    await updateShieldedTransactions(lastzheight)
    await updateRow('system', txBlock.blocks)
  }

}
let timer = setInterval(() => updateStatus(), 5000);


// <region> *** table defs ***
const tableDef = (table) => {
  return ({
    'global': () => {
      return {
        name: 'global',
        columns: [
          { name: 'showhidden', type: 'BOOLEAN', value: 1 }
        ]
      }
    },
    'system': () => {
      return {
        name: 'system',
        columns: [
          { name: 'lastzheight', type: 'INTEGER', value: 1 }
        ]
      }
    },
    'account': () => {
      return {
        name: 'account',
        columns: [
          { name: 'address', type: 'TEXT' },
          { name: 'account', type: 'TEXT' },
          { name: 'visibility', type: 'BOOLEAN' },
          { name: 'balance', type: 'REAL' }
        ]
      }
    },
    'opid': () => {
      return {
        name: 'opid',
        columns: [
          { name: 'time', type: 'INTEGER' },
          { name: 'category', type: 'TEXT' },
          { name: 'toaddress', type: 'TEXT' },
          { name: 'amount', type: 'REAL' },
          { name: 'fromaddress', type: 'TEXT' },
          { name: 'txid', type: 'TEXT' },
          { name: 'memo', type: 'TEXT' },
          { name: 'isread', type: 'BOOLEAN' },
          { name: 'blockheight', type: 'INTEGER' }
        ]
      }
    },
    'recipient': () => {
      return {
        name: 'recipient',
        columns: [
          { name: 'name', type: 'TEXT' },
          { name: 'address', type: 'TEXT' },
          { name: 'memo', type: 'TEXT' }
        ]
      }
    },
    'test': () => {
      return {
        name: 'test',
        columns: [
          { name: 'address', type: 'TEXT', value: 'z-addr' },
          { name: 'account', type: 'TEXT', value: 'Current Account' },
          { name: 'visibility', type: 'BOOLEAN', value: 1 },
          { name: 'balance', type: 'REAL', value: 17.6 }
        ]
      }
    },
    'testnovalues': () => {
      return {
        name: 'testnovalues',
        columns: [
          { name: 'address', type: 'TEXT' },
          { name: 'account', type: 'TEXT' },
          { name: 'visibility', type: 'BOOLEAN' },
          { name: 'balance', type: 'REAL' }
        ]
      }
    }
  })[table]()
}
// </region> ^^^ table defs ^^^
  
// <region> *** initialise table ***
const initTable = async (tableDef) => {
    try {
        const db = await sqlite.open('/home/iain/Desktop/wallet.sqlite');
        var createSql = 'CREATE TABLE IF NOT EXISTS "' + tableDef.name + '" ('
        tableDef.columns.forEach((column, index) => {
            createSql += column.name + ' ' + column.type + ','
        })
        createSql = createSql.replace(/.$/, ')')
        await db.run(createSql)
        await db.close();
    } catch (e) {
      console.log(e)
    }
}

// <region> *** initialise table with values ***
const initTableWithValues = async (tableDef, values) => {
  try {
    const db = await sqlite.open('/home/iain/Desktop/wallet.sqlite');

    let createSql = 'CREATE TABLE IF NOT EXISTS "' + tableDef.name + '" ('
    tableDef.columns.forEach((column, index) => {
        createSql += column.name + ' ' + column.type + ','
    })
    await db.run(createSql.replace(/.$/, ')'))

    const [{count}] = await db.all('SELECT count(*) as count FROM system')
    if (count < 1) {
      let insertSql = 'INSERT INTO "' + tableDef.name + '" VALUES ('
      values.forEach((value) => {
          insertSql += '"' + value + '",'
      })
      await db.run(insertSql.replace(/.$/, ')'))
      await db.close();
    }
  } catch (e) {
    console.log(e)
  }
}
// <region> *** initialise table with values ***


// <region> *** insert row ***
const insRow = async (tableName, values) => {
  try {
    const db = await sqlite.open('/home/iain/Desktop/wallet.sqlite');
      var insertSql = 'INSERT INTO "' + tableName + '" VALUES ('
      values.forEach((value) => {
          insertSql += '"' + value + '",'
      })
      insertSql = insertSql.replace(/.$/, ')')
      await db.run(insertSql)
      await db.close()
  } catch (e) {
    console.log(e)
  }
}
// </region> ^^^ insert row ^^^

// <region> *** table empty ***
const tableEmpty = async (tableName) => {
  try {
      const db = await sqlite.open('/home/iain/Desktop/wallet.sqlite');
      var selectSql = 'SELECT count(*) as count FROM "' + tableName + '"'
      let result = await db.all(selectSql)
      await db.close()
      return result[0].count < 1
        ? true
        : false
  } catch (e) {
    console.log(e)
  }
}
// </region> ^^^ table empty ^^^

// <region> *** select row ***
const sqlCmd = async (sql) => {
  try {
      const db = await sqlite.open('/home/iain/Desktop/wallet.sqlite');
      let result = await db.all(sql)
      await db.close()
      return result
  } catch (e) {
    console.log(e)
  }
}
// </region> ^^^ select row ^^^

// <region> *** select item ***
const selItem = async (tableName) => {
  try {
      const db = await sqlite.open('/home/iain/Desktop/wallet.sqlite');
      var selectSql = 'SELECT * FROM "' + tableName + '"'
      let result = await db.all(selectSql)
      console.log(result.length)
      await db.close()
      if (result.length > 0) {
        return (result[0]).lastzheight
      } else {
        return [0]
      }
  } catch (e) {
    console.log(e)
  }
}
// </region> ^^^ select row ^^^

// <region> *** update row ***
const updtRow = async (tableName, value) => {
  try {
      const db = await sqlite.open('/home/iain/Desktop/wallet.sqlite');
      var selectSql = 'UPDATE "' + tableName + '" SET lastzheight = ' + value
      let result = await db.all(selectSql)
      await db.close()
  } catch (e) {
    console.log(e)
  }
}
// </region> ^^^ update row ^^^


export const isTableEmpty = async (tableName) => {
  return await tableEmpty(tableName)
}

export const createTable = async (tableName) => {
  await initTable(tableDef(tableName))
}

export const createTableWithValues = async (tableName, values) => {
  await initTableWithValues(tableDef(tableName), values)
}
  
export const insertRow = async (tableName, values) => {
  await insRow(tableName, values)
}

export const sqlCommand = async (sql) => {
  return (await sqlCmd(sql))
}

export const selectItem = async (tableName) => {
  return (await selItem(tableName))
}

export const updateRow = async (tableName, value) => {
  await updtRow(tableName, value)
}