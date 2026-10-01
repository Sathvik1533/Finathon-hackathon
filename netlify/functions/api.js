const serverless = require('serverless-http');
const path = require('path');

let app;
const candidatePaths = [
  path.resolve(__dirname, '../../../api/dist/server'),
  path.resolve(__dirname, '../../api/dist/server'),
  path.resolve(__dirname, '../api/dist/server'),
  path.resolve(process.cwd(), 'api/dist/server')
];

for (const p of candidatePaths) {
  try {
    const mod = require(p);
    app = mod.default || mod;
    if (app) break;
  } catch (e) {
    // try next candidate
  }
}

if (!app) {
  throw new Error('Could not locate api/dist/server from ' + __dirname);
}

module.exports.handler = serverless(app);
