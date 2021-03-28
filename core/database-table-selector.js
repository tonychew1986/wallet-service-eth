var coin = "eth";

let dbTableSelector = async function(network, tableType) {
   var promise = new Promise(function(resolve, reject){
      let tableName = tableType + "_" + coin + "_testnet";
      if(network == "mainnet"){
        tableName = tableType + "_" + coin;
      }

      resolve(tableName);
   });
   return promise;
}

exports.dbTableSelector = dbTableSelector;
