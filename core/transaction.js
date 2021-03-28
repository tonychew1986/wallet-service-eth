

const axios = require('axios');

const lightwallet = require('eth-lightwallet');
var txutils = lightwallet.txutils;
var signing = lightwallet.signing;
var encryption = lightwallet.encryption;

const EthereumTx = require('ethereumjs-tx').Transaction

require('dotenv').config()

const config = require('config');

const nodeMainnet = process.env.NODE_URI_MAINNET || config.get('node-uri-mainnet'); //  "https://mainnet.infura.io/v3/ba29ca3746574629bccb2063975f1cf7"
const nodeTestnet = process.env.NODE_URI_TESTNET || config.get('node-uri-testnet'); //  "https://ropsten.infura.io/v3/c49355f661ea403ca9aeb237dce70e94"

const Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider(nodeTestnet));

var database = require('./db.js');

var dbTableSelect = require('./database-table-selector.js');


global.db = database.setupDB(
  process.env.DB_HOST,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  process.env.DB_DATABASE
);

global.dbAction = database.setupDB(
  process.env.DB_HOST,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  process.env.DB_DATABASE_ACTION
);

global.dbHoldingArea = database.setupDB(
  process.env.DB_HOST,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  process.env.DB_DATABASE_HOLDINGAREA
);

let checkNonce = async function(network) {
  let nonce = await getNonceFromDB(network)
  if(nonce){
    nonce = await updateNonceToDB(network, nonce["nonce"], nonce["id"]);
  }else{
    let nonceInit = await initNonceToDB(network);
    nonce = await updateNonceToDB(network, 0, nonceInit["insertId"]);
  }

  return nonce
}

let getNonceFromDB = async function(network) {
  let tableName = await dbTableSelect.dbTableSelector(network, "nonce");

   var promise = new Promise(function(resolve, reject){
     let query = "SELECT nonce from `" + tableName + "` LIMIT 1";
     db.query(query, (err, result) => {
       if (err) {
           // return res.status(500).send(err);
       }

       console.log("result", result[0])

       let nonce;
       if(result[0] !== undefined){
         nonce = result[0]
         resolve(nonce);
       }else{
         resolve(false)
       }

     });
   });
   return promise;
}

let updateNonceToDB = async function(network, nonce, id) {
  let tableName = await dbTableSelect.dbTableSelector(network, "nonce");

  var promise = new Promise(function(resolve, reject){
    newNonce = nonce + 1
    let query = "UPDATE `" + tableName + "` SET `nonce` = '" + newNonce + "' WHERE `" + tableName + "`.`id` = '" + id + "'";
    db.query(query, (err, result) => {
        if (err) {
            // return res.status(500).send(err);
        }

        resolve([nonce, newNonce]);
    });
  });
  return promise;
}


let initNonceToDB = async function(network) {
  let tableName = await dbTableSelect.dbTableSelector(network, "nonce");

  var promise = new Promise(function(resolve, reject){
    let query = "INSERT INTO `" + tableName + "` (nonce) VALUES(0);";
    db.query(query, (err, result) => {
        if (err) {
            // return res.status(500).send(err);
        }

        console.log("result", result)

        resolve(result);
    });
  });
  return promise;
}

let resetNonce = async function(network) {
  let tableName = await dbTableSelect.dbTableSelector(network, "nonce");

  let nonce = await getNonceFromDB(network);
  let id = nonce["id"]

  var promise = new Promise(function(resolve, reject){
    newNonce = 0
    let query = "UPDATE `" + tableName + "` SET `nonce` = '" + newNonce + "' WHERE `" + tableName + "`.`id` = '" + id + "'";
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).send(err);
        }

        console.log("newNonce", newNonce);
        resolve(newNonce);
    });
  });
  return promise;
}


let getBalance = async function(network, senderAdd) {
  var promise = new Promise(async function(resolve, reject){
    web3 = new Web3(new Web3.providers.HttpProvider(nodeTestnet));
    if(network == "mainnet"){
      web3 = new Web3(new Web3.providers.HttpProvider(nodeMainnet));
    }

    let balance = await web3.eth.getBalance(senderAdd);

    resolve(balance);
  });
  return promise;
}

let getTokenBalance = async function(network, tokenType, senderAdd) {
  var promise = new Promise(async function(resolve, reject){
    let minABI = [
      // balanceOf
      {
        "constant":true,
        "inputs":[{"name":"_owner","type":"address"}],
        "name":"balanceOf",
        "outputs":[{"name":"balance","type":"uint256"}],
        "type":"function"
      },
      // decimals
      {
        "constant":true,
        "inputs":[],
        "name":"decimals",
        "outputs":[{"name":"","type":"uint8"}],
        "type":"function"
      }
    ];

    web3 = new Web3(new Web3.providers.HttpProvider(nodeTestnet));
    if(network == "mainnet"){
      web3 = new Web3(new Web3.providers.HttpProvider(nodeMainnet));
    }


    let tokenAddress = "";
    tokenType = tokenType.toUpperCase();
    // tokenAddress = contractAddress[tokenType][network]
    tokenAddress = config.get(tokenType + '.address.' + network);

    let contract = new web3.eth.Contract(minABI, tokenAddress);
    contract.methods.balanceOf(senderAdd).call((error, balance) => {
      contract.methods.decimals().call((error, decimals) => {
        balance = balance/(10 ** decimals);
        // console.log(balance.toString());
        resolve(balance.toString());
      });
    });

  });
  return promise;
}

let convertDenomination = async function(amount) {
  let promise = await new Promise(function(resolve, reject) {
    let n = amount * (Math.pow(10, 18))
    n = Number(n).toPrecision();

    resolve(n);
  })

  return promise;
}

let checkDenomination = async function(amountInPrimaryDenomination, amountInLowestDenomination) {
  let promise = await new Promise(function(resolve, reject) {
    let amount = amountInPrimaryDenomination * (Math.pow(10, 18))
    amount = Number(amount).toPrecision();
    let amountAdjusted = Math.floor(amount);
    if(amountAdjusted != amountInLowestDenomination) {
      resolve("fail");
    } else {
      resolve("success");
    }
  })

  return promise;
}

let txActionLog = async function(network, user, action, amount, data) {
  let tableName = await dbTableSelect.dbTableSelector(network, "action");

  var promise = new Promise(function(resolve, reject){
    // when approving send from holding area, "created_by" will still be used here. holding area db data will be using "approved_by"
    // this difference is due to functionality but this naming convention is correct.
    let query = 'INSERT INTO `' + tableName + '` (created_by, action, amount, data, confirmed) VALUES("' + user +'", "' + action +'", "' + amount +'", "' + data +'", false);'

    // console.log("query", query);

    dbAction.query(query, (err, result) => {
        if (err) {
            // return res.status(500).send(err);
            resolve("fail");
        }

        resolve("success");
    });
  });
  return promise;
}


let txAddHoldingArea = async function(network, user, sender_addr, receiver_addr, amount, token, data, useCase, walletName) {
  let tableName = await dbTableSelect.dbTableSelector(network, "pending");

  var promise = new Promise(function(resolve, reject){
    let query = 'INSERT INTO `' + tableName + '` (created_by, approved_by, sender_addr, receiver_addr, amount, token, data, tx_hash, use_case, processed, flagged, wallet) VALUES("' + user +'", "", "' + sender_addr +'", "' + receiver_addr +'", "' + amount +'", "' + token +'", "' + data +'", "", "' + useCase +'", false, false, "' + walletName + '");'

    dbHoldingArea.query(query, (err, result) => {
        if (err) {
            return res.status(500).send(err);
            resolve("fail");
        }

        resolve("success");
    });
  });
  return promise;
}

let txUpdateHoldingArea = async function(network, user, sender_addr, receiver_addr, amount, token, data, id, txHash) {
  let tableName = await dbTableSelect.dbTableSelector(network, "pending");

  var promise = new Promise(function(resolve, reject){
    // set txhash, approved_by, processed
    // where sender_addr, receiver_addr, amount, token, data
    let query = "UPDATE `" + tableName + "` SET `tx_hash` = '" + txHash + "', `approved_by` = '" + user + "', `processed` = '1' WHERE `id` = '" + id + "'";

    // let query = "UPDATE `" + tableName + "` SET `tx_hash` = '" + txHash + "', `approved_by` = '" + user + "', `processed` = 'true' WHERE `" + tableName + "`.`id` = '" + id + "', `" + tableName + "`.`sender_addr` = '" + sender_addr + "', `" + tableName + "`.`receiver_addr` = '" + receiver_addr + "', `" + tableName + "`.`amount` = '" + amount + "'";

    dbHoldingArea.query(query, (err, result) => {
        if (err) {
            // return result.status(500).send(err);
            console.log("result", result);
            resolve("fail");
        }

        resolve("success");
    });
  });
  return promise;
}

let txCheckHoldingArea = async function(network, processed, pageSize, pageNum, filterProcessed, filterFlagged) {
  let tableName = await dbTableSelect.dbTableSelector(network, "pending");

  let pS = parseInt(pageSize)
  let pN = parseInt(pageNum)

  let startIndex = (pN * pS);
  let endIndex = pS;

  console.log(startIndex, endIndex)


  var promise = new Promise(function(resolve, reject){
    let query = "SELECT * FROM " + tableName + " WHERE `processed` = '" + filterProcessed + "' AND `flagged` = '" + filterFlagged + "' LIMIT " + startIndex +"," + endIndex +";"
    // let query = 'SELECT * FROM `' + tableName + '` LIMIT ' + startIndex +',' + endIndex +';'

    dbHoldingArea.query(query, (err, result) => {
        if (err) {
            // return res.status(500).send(err);
            resolve("fail");
        }

        resolve(result);
    });
  });
  return promise;
}

let txBroadcast = async function(network, signedTx) {
  let tx = await new Promise(function(resolve, reject) {
    let txHash = ""

    web3 = new Web3(new Web3.providers.HttpProvider(nodeTestnet));
    if(network == "mainnet"){
      web3 = new Web3(new Web3.providers.HttpProvider(nodeMainnet));
    }

    web3.eth.sendSignedTransaction(signedTx, function(err, hash) {
      if (!err) {
        txHash = hash
        console.log("hash", hash);
      } else {
        console.log("err", err); // [Error: invalid argument 0: json: cannot unmarshal hex string without 0x prefix into Go value of type hexutil.Bytes]
      }

      resolve(txHash);
    });
  }).then(function(txHash) { // (**)

    console.log("txHash", txHash); // 1
    return txHash;
  });

  return tx
}

let getEstimatedGas = async function() {
  let promise = await new Promise(function(resolve, reject) {
    axios.get("https://ethgasstation.info/json/ethgasAPI.json")
    .then(function (response) {
      console.log(response["data"]["average"]);
      resolve(response["data"]["average"]);
    })
    .catch(function (error) {
      console.log(error);
      resolve(21);
    });
  });

  return promise
}

let getNonce = async function(network, senderAdd) {
  var promise = new Promise(async function(resolve, reject){
    web3 = new Web3(new Web3.providers.HttpProvider(nodeTestnet));
    if(network == "mainnet"){
      web3 = new Web3(new Web3.providers.HttpProvider(nodeMainnet));
    }

    let nonce = await web3.eth.getTransactionCount(senderAdd)

    resolve(nonce);
  });
  return promise;
}

let txHoldingAreaToggleFlag = async function(network, id, senderAdd, receiverAdd, flagged) {
  let tableName = await dbTableSelect.dbTableSelector(network, "pending");

  var promise = new Promise(function(resolve, reject){
    // set txhash, approved_by, processed
    // where sender_addr, receiver_addr, amount, token, data
    let query = "UPDATE `" + tableName + "` SET `flagged` = " + flagged + " WHERE `sender_addr` = '" + senderAdd + "' AND `receiver_addr` = '" + receiverAdd + "' AND `id` = '" + id + "'";

    // let query = "UPDATE `" + tableName + "` SET `tx_hash` = '" + txHash + "', `approved_by` = '" + user + "', `processed` = 'true' WHERE `" + tableName + "`.`id` = '" + id + "', `" + tableName + "`.`sender_addr` = '" + sender_addr + "', `" + tableName + "`.`receiver_addr` = '" + receiver_addr + "', `" + tableName + "`.`amount` = '" + amount + "'";

    dbHoldingArea.query(query, (err, result) => {
        if (err) {
            // return result.status(500).send(err);
            console.log("result", result);
            resolve("fail");
        }

        resolve("success");
    });
  });
  return promise;
}

exports.txHoldingAreaToggleFlag = txHoldingAreaToggleFlag;
exports.txUpdateHoldingArea = txUpdateHoldingArea;
exports.txCheckHoldingArea = txCheckHoldingArea;
exports.txAddHoldingArea = txAddHoldingArea;
exports.getNonce = getNonce;
exports.getEstimatedGas = getEstimatedGas;
exports.convertDenomination = convertDenomination;
exports.checkDenomination = checkDenomination;
exports.txActionLog = txActionLog;
exports.getBalance = getBalance;
exports.getTokenBalance = getTokenBalance;
exports.checkNonce = checkNonce;
exports.getNonceFromDB = getNonceFromDB;
exports.updateNonceToDB = updateNonceToDB;
exports.resetNonce = resetNonce;
exports.txBroadcast = txBroadcast;
