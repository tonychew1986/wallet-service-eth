Wallet Service for Ethereum (ETH)
=====================================

<URL>

How does this work?
----------------

Wallet service is used in conjunction with Signature service to enable secure signing and transaction related functionality for blockchain. Since different blockchain have nuance differences, this services are application specific.

This service should not be called directly (besides during testing) and should only be called through Wallet Aggregator in production. This is to  prevent errors from sending coins on main net. Safeguards are applied on Wallet Aggregator that always defaults any calls to testnet.

Application Flow
-------

Client UI <-> Wallet Aggregator <-> Wallet Service <-> Signature Service

Blockchain Differences
-------

- Sending ERC 20 tokens
- Requires smart contract ABI & noting down decimal point of token

Available End points
-------
- GET /test
- GET /nonce?network=<network>
- GET /nonce/reset?network=<network>
- GET /wallet?network=<network>
- GET /wallet/query?network=<network>&nonce=<nonce>
- POST /send [network, amount, senderAdd, receiverAdd]
- POST /send/token [network, amount, tokenType, senderAdd, receiverAdd]

ENV parameters
-------
Available at ./instructions/env.md


Database Initialisation
-------
Available at ./instructions/db.md

## Instructions

To test application:

```bash
$ npm test
```

Install NPM modules on fresh deployment:

```bash
$ npm install
```

To run in development mode:

```bash
$ node index.js
```

To run in production mode:

```bash
$ pm2 start wallet-svc-eth/index.js --name "wallet-eth"
```


Wallet Implementation Reference
-------

1. Download Metamask plugin on Chrome browser
2. Create an account
3. Toggle network to "Ropsten"

The generated addresses of the mnemonic seed should be identical to what is shown on Metamask.
