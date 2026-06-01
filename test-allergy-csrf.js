const http = require('http');

http.get('http://localhost:3000/auth/login', (res) => {
  let cookie = res.headers['set-cookie'];
  if (cookie) cookie = cookie[0].split(';')[0];
  
  let data = '';
  res.on('data', c => data+=c);
  res.on('end', () => {
    const match = data.match(/name="_csrf" value="([^"]+)"/);
    if (!match) return console.log('No csrf found');
    const token = match[1];
    
    const req2 = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/allergy/check',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        'Cookie': cookie
      }
    }, (res2) => {
      let d2 = '';
      res2.on('data', c=> d2+=c);
      res2.on('end', () => console.log('Status POST:', res2.statusCode));
    });
    req2.write(JSON.stringify({medicineName: 'Amoxicillin'}));
    req2.end();
  });
});
