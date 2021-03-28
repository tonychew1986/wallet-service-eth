const request = require('supertest');
const app = require('../index');
const tx = require('../core/transaction');

const axios = require('axios');
const nock = require('nock')

const sinon = require('sinon');
var expect  = require('chai').expect;

describe('Basic endpoint to test if service is active', function () {
    it('GET /test', function (done) {
        request(app)
          .get('/test')
          .expect(200)
          .end((err, res) => {
             if (err) {
               return done(err);
             }
             expect(res.text).to.be.equal('test');
             return done();
          });
    });
});

describe('Check database connectivity', function () {
    it('GET /nonce/check', function (done) {
        request(app)
          .get('/nonce/check')
          .expect(200)
          .end((err, res) => {
             if (err) {
               return done(err);
             }
             var resBody = res["body"];
             var nonce = resBody["nonce"];

             expect(nonce).to.satisfy(Number.isInteger);
             return done();
          });
    });
});

//need to bypass the authorization checking before run this test
describe('check eth send customized gas limit', function () {
  it('POST /send', function (done) {
      request(app)
        .post('/send')
        .send({
          network: "testnet",
          amount_in_eth: 0.00015,
          sender_add: "0x8099E1f8B72Dd1881e4ac588722078408543CB2E",
          receiver_add: "0x8099E1f8B72Dd1881e4ac588722078408543CB2E",
          gas_limit: "",
        })
        .expect(200)
        .end((err, res) => {
           if (err) {
             return done(err);
           }
           var resBody = res["body"];
           var signedTx = resBody["signedValueTx"];
           var txHash = resBody["txHash"];

           console.log("signedTx is", signedTx);
           console.log("txHash is", txHash);

           //expect(nonce).to.satisfy(Number.isInteger);
           return done();
        });
  });
  
  it('POST /send no gaslimit', function (done) {
    request(app)
      .post('/send')
      .send({
        network: "testnet",
        amount_in_eth: 0.00015,
        sender_add: "0x8099E1f8B72Dd1881e4ac588722078408543CB2E",
        receiver_add: "0x8099E1f8B72Dd1881e4ac588722078408543CB2E",
        gas_limit: "120000",
      })
      .expect(200)
      .end((err, res) => {
         if (err) {
           return done(err);
         }
         var resBody = res["body"];
         var signedTx = resBody["signedValueTx"];
         var txHash = resBody["txHash"];

         console.log("signedTx is", signedTx);
         console.log("txHash is", txHash);

         //expect(nonce).to.satisfy(Number.isInteger);
         return done();
      });
});
it('POST /send no gaslimit', function (done) {
  request(app)
    .post('/send')
    .send({
      network: "testnet",
      amount_in_eth: 0.00012,
      sender_add: "0x8099E1f8B72Dd1881e4ac588722078408543CB2E",
      receiver_add: "0x8099E1f8B72Dd1881e4ac588722078408543CB2E",
    })
    .expect(200)
    .end((err, res) => {
       if (err) {
         return done(err);
       }
       var resBody = res["body"];
       var signedTx = resBody["signedValueTx"];
       var txHash = resBody["txHash"];

       console.log("signedTx is", signedTx);
       console.log("txHash is", txHash);

       //expect(nonce).to.satisfy(Number.isInteger);
       return done();
    });
});

});

describe("Test denomination", function() {
  it("test demonination", async function(){
    console.log("haahahha");
    let amountPrimary = 0.123;
    let amountLeast = await tx.convertDenomination(amountPrimary);
    amountLeast = Math.floor(amountLeast);

    let checkResult = await tx.checkDenomination(amountPrimary, amountLeast);
    console.log("check result is", checkResult);
    expect(checkResult).to.equal("success");
  });
});

/*
// For this endpoint to work, signature service for ETH have to be running on localhost
describe('Send endpoint to transfer ETH', function () {

  before(() => {
    nock.disableNetConnect()
    // Allow localhost connections so we can test local routes and mock servers.
    nock.enableNetConnect('127.0.0.1')
  });

  after(() => {
    nock.cleanAll();
  });
  // Send ETH from account with no ETH
  // Send ETH from account with ETH
  it('POST testnet /send success', function (done) {
      nock('http://localhost')
      .post('/send', {
        network: 'testnet',
        amount_in_eth: 100000000,
        sender_add: '0x9E013304072C0B919e64721cB550B280a1F021f6',
        receiver_add: '0x8099E1f8B72Dd1881e4ac588722078408543CB2E'
      })
      .reply(200, {
        signedValueTx: '0xf870218504a817c800830186a0948099e1f8b72dd1881e4ac588722078408543cb2e8b52b7d2dcc80cd2e40000008029a0b9963e3a7c0399f37395095f429cf0e8f95e02bb04d51867ff21d4b4c3d125f0a05f269cec408ae93cf5a13c49eb3c48eff5ff52f074c34be7ccf6b5387c4d402b',
        txHash: ''
      })

      axios.post('/send', {
        network: 'testnet',
        amount_in_eth: 100000000,
        sender_add: '0x9E013304072C0B919e64721cB550B280a1F021f6',
        receiver_add: '0x8099E1f8B72Dd1881e4ac588722078408543CB2E'
      })
      .then(function (response) {
        var resBody = response["data"];
        var resSignedTx = resBody["signedValueTx"];
        var resBodyTxCheck = resSignedTx.substring(0,2);

        expect(resBodyTxCheck).to.be.equal('0x');
        return done();
      })

    });

    it('POST testnet /send failure', function (done) {
        nock('http://localhost')
        .post('/send', {
          network: 'testnet',
          amount_in_eth: 100000000,
          sender_add: '0x9E013304072C0B919e64721cB550B280a1F021f6',
          receiver_add: '0x8099E1f8B72Dd1881e4ac588722078408543CB2E'
        })
        .reply(200, {
          signedValueTx: '0x',
          txHash: ''
        })

        axios.post('/send', {
          network: 'testnet',
          amount_in_eth: 100000000,
          sender_add: '0x9E013304072C0B919e64721cB550B280a1F021f6',
          receiver_add: '0x8099E1f8B72Dd1881e4ac588722078408543CB2E'
        })
        .then(function (response) {
          var resBody = response["data"];
          var resSignedTx = resBody["signedValueTx"];
          var resBodyTxCheck = resSignedTx.substring(0,2);

          expect(resBodyTxCheck).to.be.equal('0x');
          return done();
        })

      });
});
*/