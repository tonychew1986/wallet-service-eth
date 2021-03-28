

const mysql = require('mysql');

let setupDB = function(host, user, password, database) {
  const db = mysql.createConnection ({
      host: host,
      user: user,
      password: password,
      database: database
  });
  
  db.connect((err) => {
      if (err) {
          throw err;
      }
      console.log('Connected to database');
  });

  return db
}

exports.setupDB = setupDB;
