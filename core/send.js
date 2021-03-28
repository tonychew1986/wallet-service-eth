
const axios = require('axios');

var txETH = require('../core/transaction.js');

require('dotenv').config()

const config = require('config');

const gasRepoAddress = process.env.GAS_REPO_ADDRESS || config.get('gas-repo-address'); // "0x9E013304072C0B919e64721cB550B280a1F021f6";

let sendETH = async function(signatureAPI, network, balance, amountInPrimaryDenomination, amountInLowestDenomination, senderAdd, receiverAdd, nonce, gas, gasLimit, user, includeFeeInSentAmount) {
  console.log("signatureAPI", signatureAPI)
  var promise = new Promise(async function(resolve, reject){

    let checkDenomination = await txETH.checkDenomination(amountInPrimaryDenomination, amountInLowestDenomination);
    if (checkDenomination != "success") return resolve({"message": "denomination is wrong"});

    if(balance > amountInPrimaryDenomination){
      if(senderAdd.toLowerCase() !== gasRepoAddress.toLowerCase() || amountInPrimaryDenomination < 0.1){
        let finalAmount;

        if(includeFeeInSentAmount && amountInPrimaryDenomination >= 0.1){
          finalAmount = amountInPrimaryDenomination - 0.005; // need deduct gas
        }else{
          finalAmount = amountInPrimaryDenomination; // full amount
        }

        axios.post(signatureAPI + '/send', {
          network: network,
          amount: finalAmount,
          senderAdd: senderAdd,
          receiverAdd: receiverAdd,
          nonce: nonce,
          gas: gas,
          gasLimit: gasLimit
        })
        .then(async function (response) {
          signedTx = response["data"]

          console.log("signedTx", signedTx)

          tx = await txETH.txBroadcast(network, signedTx)

          console.log("tx", tx)

          txETH.txActionLog(network, user, "send", amountInPrimaryDenomination, "")

          resolve({"signedValueTx": signedTx, "txHash": tx});
        })
        .catch(function (error) {
          console.log(error);
        });
      }else{
        //return res.json({"message": "Sender address have insufficient balance"});
        resolve({"message": "Sender address is Gas Repository. Sending terminated."});
      }
    }else{
      //return res.json({"message": "Sender address have insufficient balance"});
      resolve({"message": "Sender address have insufficient balance"});
    }
  });
  return promise;
}


let sendStaggeredETH = async function(network, balance, amountInPrimaryDenomination, amountInLowestDenomination, senderAdd, receiverAdd, user, useCase, walletName) {
  var promise = new Promise(async function(resolve, reject){

    let checkDenomination = await txETH.checkDenomination(amountInPrimaryDenomination, amountInLowestDenomination);
    if (checkDenomination != "success") return resolve({"message": "denomination is wrong"});

    if(balance > amountInPrimaryDenomination){
      txETH.txActionLog(network, user, "send::holding area", amountInPrimaryDenomination, "")
      txETH.txAddHoldingArea(network, user, senderAdd, receiverAdd, amountInPrimaryDenomination, "", "", useCase, walletName)

      resolve({"signedValueTx": "", "txHash": ""});
    }else{
      //return res.json({"message": "Sender address have insufficient balance"});
      resolve({"message": "Sender address have insufficient balance"});
    }
  });
  return promise;
}

let sentFromHoldingArea = async function(network, amount, senderAdd, receiverAdd, user, id, txHash) {
  var promise = new Promise(async function(resolve, reject){
    txETH.txActionLog(network, user, "sent complete::holding area", amount, "")
    txETH.txUpdateHoldingArea(network, user, senderAdd, receiverAdd, amount, "", "", id, txHash)

    resolve("done");
  });
  return promise;
}

let sendStaggeredToken = async function(network, balance, amountInPrimaryDenomination, amountInLowestDenomination, senderAdd, receiverAdd, user, useCase, tokenType) {
  var promise = new Promise(async function(resolve, reject){
    if(balance >= amountInPrimaryDenomination){
      txETH.txActionLog(network, user, "send::holding area"+"::"+tokenType, amountInPrimaryDenomination, tokenType)
      txETH.txAddHoldingArea(network, user, senderAdd, receiverAdd, amountInPrimaryDenomination, tokenType, "", useCase)

      resolve({"signedValueTx": "", "txHash": ""});
    }else{
      //return res.json({"message": "Sender address have insufficient balance"});
      resolve({"message": "Sender address have insufficient balance"});
    }
  });
  return promise;
}


let sendToken = async function(signatureAPI, network, balance, balanceToken, amount, tokenType, senderAdd, receiverAdd, nonce, gas, gasLimit, user) {
  var promise = new Promise(async function(resolve, reject){
    if(balance > 0 && balanceToken > 0){
      axios.post(signatureAPI + '/send/token', {
        network: network,
        amount: amount,
        tokenType: tokenType,
        senderAdd: senderAdd,
        receiverAdd: receiverAdd,
        nonce: nonce,
        gas: gas,
        gasLimit: gasLimit,
      })
      .then(async function (response) {
        signedTx = response["data"]

        tx = await txETH.txBroadcast(network, signedTx)

        txETH.txActionLog(network, user, "send token", amount, tokenType)

        console.log("signedTx", signedTx)
        console.log("tx", tx)
        // return res.json({"signedValueTx": signedTx});
        resolve({"signedValueTx": signedTx, "txHash": tx});
      })
      .catch(function (error) {
        console.log(error);
      });
    }else{
      resolve({"message": "Sender address have insufficient balance"});
    }
  });
  return promise;
}

let sendTokenWithGas = async function(signatureAPI, network, amount, tokenType, senderAdd, receiverAdd, user, gasLimit) {
  var promise = new Promise(async function(resolve, reject){
      let gasHoldingAddress = gasRepoAddress;
      let gas = await txETH.getEstimatedGas(); // amount in gwei
      let gasLimitDefault = "";//@@XM for sending gas, default gaslimit should be ok.

      // will need to increase gasAmountFromGasRepo
      let gasAmountFromGasRepo = 0.003;
      let gasAmountFromGasRepoInLowestDenomination = await txETH.convertDenomination(gasAmountFromGasRepo);

      // Number((gas * 10000)/Math.pow(10, 10)).toPrecision();
      //"0.01" // gwei is 10 ^ 10, wei is 10 ^ 18

      console.log("gasAmountFromGasRepo", gasAmountFromGasRepo);

      let nonceGasHolding = await txETH.getNonce(network, gasHoldingAddress);
      let nonceSender = await txETH.getNonce(network, senderAdd);

      let transferDelay = 40;

      let balanceGasHolding = await txETH.getBalance(network, gasHoldingAddress);
      let balanceSender = await txETH.getBalance(network, senderAdd);

      let balanceToken = await txETH.getTokenBalance(network, tokenType, senderAdd); //Will give value in.
      console.log("balanceGasHolding", balanceGasHolding)
      console.log("balanceSender", balanceSender)
      console.log("balanceToken", balanceToken)

      let minGas = (gasAmountFromGasRepoInLowestDenomination / 2); //0.01 * Math.pow(10, 18)
      console.log("minGas", minGas)

      // if(balanceSender < 99999999999999999999){
      if(balanceSender < gasAmountFromGasRepoInLowestDenomination){
        console.log("NEED TO SEND GAS!!!!!!!")

        var amountInPrimaryDenomination = gasAmountFromGasRepo;
        var amountInLowestDenomination = gasAmountFromGasRepoInLowestDenomination;

        let responseETH = await sendETH(signatureAPI, network, balanceGasHolding, amountInPrimaryDenomination, amountInLowestDenomination, gasHoldingAddress, senderAdd, nonceGasHolding, gas, gasLimitDefault, user + "::gas repo", true);
        console.log("responseETH", responseETH)

        await sleep(transferDelay * 1000)
      }

      let responseToken = await sendToken(signatureAPI, network, balanceSender, balanceToken, amount, tokenType, senderAdd, receiverAdd, nonceSender, gas, gasLimit, user);
      console.log("responseToken", responseToken)

      // return res.json(responseToken);
      resolve(responseToken);
  });
  return promise;
}

function sleep(ms){
    return new Promise(resolve => {
        setTimeout(resolve,ms)
    })
}

exports.sendETH = sendETH;
exports.sendStaggeredETH = sendStaggeredETH;
exports.sendStaggeredToken = sendStaggeredToken;
exports.sendToken = sendToken;
exports.sendTokenWithGas = sendTokenWithGas;
exports.sentFromHoldingArea = sentFromHoldingArea;
