const { csrfSync } = require('csrf-sync');
const { csrfSynchronisedProtection, generateToken } = csrfSync();
const req = { session: {} };
const res = {};
csrfSynchronisedProtection(req, res, () => {
  console.log(req.csrfToken);
});
