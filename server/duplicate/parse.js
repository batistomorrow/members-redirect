const Parse = require('parse/node');

const config = {
  serverURL: 'https://club-connect-parse-server.herokuapp.com/parse',
  appId: 'vj84kC1bckQ8VVeCPDUf',
  clientId: 'V4GJLX5Vh0ZpOyMfpJ0m',
  JSId: 'bKs82bwRSPA8C8yTV7jB',
  masterKey: 'bKs82bwRSPA8C8yTV7jB'
};

Parse.initialize(config.appId, config.clientId, config.JSId);
Parse.serverURL = config.serverURL;
Parse.masterKey = config.masterKey;

module.exports = Parse;
