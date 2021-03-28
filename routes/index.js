var express = require('express')
var router = express.Router()

const axios = require('axios');

var txETH = require('../core/transaction.js');
var auth = require('../core/auth.js');
var walletSelect = require('../core/wallet-selector.js');

var send = require('../core/send.js');

const asyncHandler = fn => (req, res, next) =>
  Promise
    .resolve(fn(req, res, next))
    .catch(next)


router.get('/test', asyncHandler(async (req, res, next) => {
  return res.send('test');
}));

router.get('/signature/test', asyncHandler(async (req, res, next) => {
  let network = req.query.network || "testnet";

  let walletName = req.query.wallet || "hot_wallet";
  let signatureAPI = await walletSelect.walletSelector(network, walletName);

  axios.get(signatureAPI + '/test')
  .then(function (response) {
    console.log(response["data"]);
    return res.send(response["data"]);
  })
  .catch(function (error) {
    console.log(error);
  });
}));

router.get('/balance', auth.isAuthorised, asyncHandler(async (req, res, next) => {
  let network = req.query.network || "testnet";
  var senderAdd = req.query.sender_add;
  var senderAddArray = senderAdd.split(',')

  let balanceArray = [];
  console.log("senderAddArray", senderAddArray);

  for(var i=0; i<senderAddArray.length; i++){
    let bal = await txETH.getBalance(network, senderAddArray[i]);
    balanceArray.push({"address": senderAddArray[i], "balance": bal});
  }

  console.log("balanceArray", balanceArray);

  // need to cater for many addresses as string or array
  // let balance = await txETH.getBalance(network, senderAdd);

  // return res.json({"address": senderAdd, "balance": balance});
  return res.json(balanceArray);
}));


router.get('/balance/token', auth.isAuthorised, asyncHandler(async (req, res, next) => {
  let network = req.query.network || "testnet";
  var senderAdd = req.query.sender_add;
  var tokenType = req.query.token_type;
  let balance = await txETH.getTokenBalance(network, tokenType, senderAdd);

  return res.json({"address": senderAdd, "token_balance": balance});
}));


// API set nonce
router.get('/wallet', auth.isAuthorised, asyncHandler(async (req, res, next) => {
  let network = req.query.network || "testnet";

  let nonceData = await txETH.checkNonce(network);
  let nonce = nonceData[0]

  data = {
    network: network,
    nonce: nonce
  }

  let walletName = req.query.wallet || "hot_wallet";
  let signatureAPI = await walletSelect.walletSelector(network, walletName);

  if(walletName == "hot_wallet"){
    axios.post(signatureAPI + '/wallet', data)
    .then(function (response) {
      console.log(response["data"]);
      return res.json({"address": response["data"], "nonce": nonce});
    })
    .catch(function (error) {
      console.log(error);
    });
  }else{
    return res.json({"message": "Wallet service requested is not identified as a hot wallet. This endpoint is not required for non hot wallet. Try using /wallet/query endpoint"});
  }
}));

router.get('/wallet/query', auth.isAuthorised, asyncHandler(async (req, res, next) => {
  let network = req.query.network || "testnet";
  let nonce = req.query.nonce;

  let walletName = req.query.wallet || "hot_wallet";
  let signatureAPI = await walletSelect.walletSelector(network, walletName);

  axios.post(signatureAPI + '/wallet', {
    network: network,
    nonce: nonce
  })
  .then(function (response) {
    console.log(response["data"]);
    return res.json({"address": response["data"], "nonce": parseInt(nonce)});
  })
  .catch(function (error) {
    console.log(error);
  });
}));

router.get('/wallet/query/all', auth.isAuthorised, asyncHandler(async (req, res, next) => {
  let network = req.query.network || "testnet";
  let nonce = req.query.nonce;

  let walletName = req.query.wallet || "hot_wallet";
  let signatureAPI = await walletSelect.walletSelector(network, walletName);

  axios.post(signatureAPI + '/wallet/all', {
    network: network,
    nonce: nonce
  })
  .then(function (response) {
    console.log(response["data"]);
    return res.json({"address": response["data"]});
  })
  .catch(function (error) {
    console.log(error);
  });
}));

router.get('/nonce', asyncHandler(async (req, res, next) => {
  let network = req.query.network || "testnet";
  let nonce = await txETH.checkNonce(network);
  console.log("nonce", nonce);
  return res.json({"nonce": nonce});
}));

router.get('/nonce/check', asyncHandler(async (req, res, next) => {
  let network = req.query.network || "testnet";
  let nonce = await txETH.getNonceFromDB(network);
  console.log("nonce", nonce);
  return res.json(nonce);
}));

router.get('/nonce/reset', asyncHandler(async (req, res, next) => {
  let network = req.query.network || "testnet";
  let nonce = await txETH.resetNonce(network);
  console.log("nonce", nonce);
  return res.json({"nonce": nonce});
}));

router.post('/send', auth.isAuthorised, asyncHandler(async (req, res, next) => {
  let network = req.body.network || "testnet";
  var amount = req.body.amount_in_eth.toString(); // 100000000
  var senderAdd = req.body.sender_add; // "0x9E013304072C0B919e64721cB550B280a1F021f6"
  var receiverAdd = req.body.receiver_add; // "0x8099E1f8B72Dd1881e4ac588722078408543CB2E"
  var gasLimit = req.body.gas_limit || "100000";

  let walletName = req.body.wallet || "hot_wallet";
  let signatureAPI = await walletSelect.walletSelector(network, walletName);

  // includeFeeInSentAmount default = true
  // if includeFeeInSentAmount = true, amount = amount - gas
  // if includeFeeInSentAmount = false, amount = amount
  var includeFeeInSentAmount = req.body.include_fee || true;

  let nonce = await txETH.getNonce(network, senderAdd);

  let gas = await txETH.getEstimatedGas();

  var user = req.body.user || ""

  let balance = await txETH.getBalance(network, senderAdd);

  console.log("balance", balance)

  var amountInPrimaryDenomination = amount;

  amount = await txETH.convertDenomination(amount);

  amount = Math.floor(amount);

  var amountInLowestDenomination = amount;

  let response = await send.sendETH(signatureAPI, network, balance, amountInPrimaryDenomination, amountInLowestDenomination, senderAdd, receiverAdd, nonce, gas, gasLimit, user, includeFeeInSentAmount);
  console.log("response", response)


  return res.json(response);
}));


router.post('/stagger/send', auth.isAuthorised, asyncHandler(async (req, res, next) => {
  let network = req.body.network || "testnet";
  var amount = req.body.amount_in_eth.toString(); // 100000000
  var senderAdd = req.body.sender_add;
  var receiverAdd = req.body.receiver_add;

  var useCase = req.body.use_case;

  let wallet = req.body.wallet || "hot_wallet";

  var user = req.body.user || ""

  let balance = await txETH.getBalance(network, senderAdd);

  console.log("balance", balance)

  var amountInPrimaryDenomination = amount;

  amount = await txETH.convertDenomination(amount);

  amount = Math.floor(amount);

  var amountInLowestDenomination = amount;

  let response = await send.sendStaggeredETH(network, balance, amountInPrimaryDenomination, amountInLowestDenomination, senderAdd, receiverAdd, user, useCase, wallet);
  console.log("response", response)

  return res.json(response);
}));


router.post('/stagger/send/token', auth.isAuthorised, asyncHandler(async (req, res, next) => {
  let network = req.body.network || "testnet";
  var amount = req.body.amount_in_token.toString(); // 100000000
  var senderAdd = req.body.sender_add;
  var receiverAdd = req.body.receiver_add;

  var tokenType = req.body.token_type;

  var useCase = req.body.use_case;

  let wallet = req.body.wallet || "hot_wallet";

  var user = req.body.user || ""

  let balance = await txETH.getTokenBalance(network, tokenType, senderAdd);

  console.log("balance", balance)

  var amountInPrimaryDenomination = amount;

  // amount = await txETH.convertDenomination(amount);
  //
  // amount = Math.floor(amount);

  var amountInLowestDenomination = amount;

  let response = await send.sendStaggeredToken(network, balance, amountInPrimaryDenomination, amountInLowestDenomination, senderAdd, receiverAdd, user, useCase, tokenType); // , wallet
  console.log("response", response)

  return res.json(response);
}));

router.post('/holding-area', auth.isAuthorised, asyncHandler(async (req, res, next) => {
  let network = req.body.network || "testnet";
  let pageSize = req.body.page_size || "20";
  let pageNum = req.body.page_num || "0";

  let filterProcessed = req.body.filter_processed || "0";
  let filterFlagged = req.body.filter_flagged || "0";

  // add filter by wallet option
  let wallet = req.body.wallet || "hot_wallet";

  let response = await txETH.txCheckHoldingArea(network, 0, pageSize, pageNum, filterProcessed, filterFlagged);

  console.log("response", response)

  return res.json(response);
}));

router.post('/holding-area/flag', auth.isAuthorised, asyncHandler(async (req, res, next) => {
  let network = req.body.network || "testnet";
  let id = req.body.id;
  let senderAdd = req.body.sender_addr;
  let receiverAdd = req.body.receiver_addr;
  let flagged = req.body.flagged;

  if(flagged == 'false' || flagged == false || flagged == '0' || flagged == 0){
    // not flagged
    flagged = false;
  }else{
    // flagged
    flagged = true;
  }

  let response = await txETH.txHoldingAreaToggleFlag(network, id, senderAdd, receiverAdd, flagged);
  console.log("response", response)

  return res.json(response);
}));

router.post('/holding-area/send', auth.isAuthorised, asyncHandler(async (req, res, next) => {
  let network = req.body.network || "testnet";
  let user = req.body.user || ""

  let walletName = req.body.wallet || "hot_wallet";
  let signatureAPI = await walletSelect.walletSelector(network, walletName);

  let pageSize = "20";
  let pageNum = "0";

  let filterProcessed = req.body.filter_processed || "0";
  let filterFlagged = req.body.filter_flagged || "0";

  let holdingBalanceTxs = await txETH.txCheckHoldingArea(network, 0, pageSize, pageNum, filterProcessed, filterFlagged);
  console.log("holdingBalanceTxs", holdingBalanceTxs)

  let gas = await txETH.getEstimatedGas();

  let gasLimit = "";  //@@XM don't provide for staggered send first

  let transferDelay = 60;

  console.log("holdingBalanceTxs.length", holdingBalanceTxs.length)

  // includeFeeInSentAmount default = true
  // if includeFeeInSentAmount = true, amount = amount - gas
  // if includeFeeInSentAmount = false, amount = amount
  var includeFeeInSentAmount = req.body.include_fee || true;

  let addressNonceArray = [];

  for(var i = 0; i < holdingBalanceTxs.length; i++){
    let id = holdingBalanceTxs[i]["id"];
    let senderAdd = holdingBalanceTxs[i]["sender_addr"].toLowerCase();
    let receiverAdd = holdingBalanceTxs[i]["receiver_addr"].toLowerCase();
    let amount = holdingBalanceTxs[i]["amount"];
    let tokenType = holdingBalanceTxs[i]["token"];
    let data = holdingBalanceTxs[i]["data"];
    let processed = holdingBalanceTxs[i]["processed"];
    let flagged = holdingBalanceTxs[i]["flagged"];

    console.log("id", id)
    console.log("senderAdd", senderAdd)

    if(processed == 0){
      if(flagged == 0){
        let nonce = 0;

        for(var r=0; r<addressNonceArray.length; r++){
          if(addressNonceArray[r][0] == senderAdd){
            nonce = addressNonceArray[r][1] + 1;
          }
        }
        console.log("nonce", nonce)

        if(nonce == 0){
          nonce = await txETH.getNonce(network, senderAdd);
          addressNonceArray.push([senderAdd, nonce]);
        }else{
          // replace existing nonce in array with senderAddr
          for(var p=0; p<addressNonceArray.length; p++){
            if(addressNonceArray[p][0] == senderAdd){
              addressNonceArray[p][1] = nonce;
            }
          }
        }

        console.log("addressNonceArray", addressNonceArray)

        let txHash = "";

        if(tokenType == ""){
          // ETH
          let balance = await txETH.getBalance(network, senderAdd);

          console.log("balance", balance)

          var amountInPrimaryDenomination = amount;

          amount = await txETH.convertDenomination(amount);

          amount = Math.floor(amount);

          var amountInLowestDenomination = amount;

          let response = await send.sendETH(signatureAPI, network, balance, amountInPrimaryDenomination, amountInLowestDenomination, senderAdd, receiverAdd, nonce, gas, gasLimit, user, includeFeeInSentAmount);

          console.log("response sendETH", response)

          txHash = response["txHash"];
        }else{
          // Token
          let balance = await txETH.getTokenBalance(network, tokenType, senderAdd);

          console.log("balance", balance)

          let response = await send.sendTokenWithGas(signatureAPI, network, amount, tokenType, senderAdd, receiverAdd, user, gasLimit);

          console.log("response sendTokenWithGas", response)

          // for token with gas, return only the final transaction that sent out token
          txHash = response["txHash"];
        }


        console.log("txHash", txHash)

        if(txHash !== "" && txHash !== undefined){
          let individualResult = await send.sentFromHoldingArea(network, amount, senderAdd, receiverAdd, user, id, txHash);

          console.log("individualResult", individualResult)

          await sleep(transferDelay * 1000)
        }
      }else{
        console.log("transaction flagged")
      }
    }
  }

  return res.json(holdingBalanceTxs);
}));

router.post('/send/token', auth.isAuthorised, asyncHandler(async (req, res, next) => {
  var signature = req.body.signature;

  let network = req.body.network || "testnet";
  var amount = req.body.amount_in_token.toString(); // 100000000
  var tokenType = req.body.token_type; // 100000000
  var senderAdd = req.body.sender_add; // "0x9E013304072C0B919e64721cB550B280a1F021f6"
  var receiverAdd = req.body.receiver_add; // "0x8099E1f8B72Dd1881e4ac588722078408543CB2E"
  var gasLimit = req.body.gas_limit || "100000";

  let nonce = await txETH.getNonce(network, senderAdd);

  let walletName = req.body.wallet || "hot_wallet";
  let signatureAPI = await walletSelect.walletSelector(network, walletName);

  let gas = await txETH.getEstimatedGas();

  var user = req.body.user || ""

  let balance = await txETH.getBalance(network, senderAdd);
  let balanceToken = await txETH.getTokenBalance(network, tokenType, senderAdd); //Will give value in.
  console.log("balance", balance)
  console.log("balanceToken", balanceToken)

  let response = await send.sendToken(signatureAPI, network, balance, balanceToken, amount, tokenType, senderAdd, receiverAdd, nonce, gas, gasLimit, user);
  console.log("response", response)

  return res.json(response);
}));


// get estimated gas fee from gas station
// check if send addr has enough gas
// if not, send eth from gasHoldingAddress to send addr

// wait 1 min

// check if send addr has enough gas
// if not, then wait

// wait 1 min

// check if send addr has enough gas
// if not, then timeout

// send erc 20 token


router.post('/send/token-with-gas', auth.isAuthorised, asyncHandler(async (req, res, next) => {
  let network = req.body.network || "testnet";
  var amount = req.body.amount_in_token.toString();
  var tokenType = req.body.token_type;
  var senderAdd = req.body.sender_add;
  var receiverAdd = req.body.receiver_add;
  var gasLimit = req.body.gas_limit || "100000";

  let walletName = req.body.wallet || "hot_wallet";
  let signatureAPI = await walletSelect.walletSelector(network, walletName);

  var user = req.body.user || "";

  let responseToken = await send.sendTokenWithGas(signatureAPI, network, amount, tokenType, senderAdd, receiverAdd, user, gasLimit)

  console.log("responseToken", responseToken)

  return res.json(responseToken);
}));

router.get('/explorer/sync/status', asyncHandler(async (req, res, next) => {
  let network = req.query.network || "testnet";
  var address = req.query.address;
  console.log("address", address);

  // let synced = await txBTC.getAddressSync(network, address);
  // console.log("synced", synced);

  return res.json({"synced": true});
}));

function sleep(ms){
    return new Promise(resolve => {
        setTimeout(resolve,ms)
    })
}

module.exports = router
