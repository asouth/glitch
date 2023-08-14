const { apiKeys } = require('./config');

function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const deviceId = req.body.deviceId;

  if (apiKey && apiKeys[deviceId] === apiKey) {
    next();
  } else {
    res.status(401).send('Authentication required');
  }
}

module.exports = { apiKeyAuth };
