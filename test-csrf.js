const { csrfSync } = require('csrf-sync');
const { generateToken, csrfSynchronisedProtection } = csrfSync();
console.log(generateToken);
