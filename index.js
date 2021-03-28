const routes = require('./routes/index');

const express = require('express');
const bodyParser = require('body-parser');

require('dotenv').config()

const config = require('config');

const app = express()
const port = process.env.PORT || config.get('port'); // 3000

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));


// app.listen(port, () => console.log(`Example app listening on port ${port}!`))
var server = app.listen(port, '0.0.0.0')

app.use('/', routes);

module.exports = server
