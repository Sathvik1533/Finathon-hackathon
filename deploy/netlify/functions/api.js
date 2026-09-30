const serverless = require('serverless-http');
const app = require('../../api/dist/server').default || require('../../api/dist/server');

module.exports.handler = serverless(app);
