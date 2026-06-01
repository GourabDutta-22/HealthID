const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/allergy/check',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': 'fake-token'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
});

req.on('error', console.error);
req.write(JSON.stringify({ medicineName: 'Amoxicillin' }));
req.end();
