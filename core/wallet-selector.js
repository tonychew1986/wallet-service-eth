
const axios = require('axios');

require('dotenv').config()

const config = require('config');

const signatureId_1 = process.env.SIGNATURE_API_1_IDENTIFIER || config.get('signature-api-identifier-1'); // 'hot_wallet'
const signatureIp_1 = process.env.SIGNATURE_API_1_IP || config.get('signature-api-ip-1'); // 'http://localhost'
const signaturePort_1 = process.env.SIGNATURE_API_1_PORT || config.get('signature-api-port-1'); // '3001'

const signatureId_2 = process.env.SIGNATURE_API_2_IDENTIFIER || config.get('signature-api-identifier-2'); // 'warm_wallet'
const signatureIp_2 = process.env.SIGNATURE_API_2_IP || config.get('signature-api-ip-2'); // 'http://localhost'
const signaturePort_2 = process.env.SIGNATURE_API_2_PORT || config.get('signature-api-port-2'); // '2999'

let walletSelector = async function(network, walletName) {
  var promise = new Promise(async function(resolve, reject){
    let signatureAPI = signatureIp_1 + ":" + signaturePort_1;
    if(walletName == "warm_wallet"){
      signatureAPI = signatureIp_2 + ":" + signaturePort_2;
    }

    resolve(signatureAPI);
  });
  return promise;
}

exports.walletSelector = walletSelector;
