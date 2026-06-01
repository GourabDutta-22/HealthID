const http = require('http');

http.get('http://localhost:3000/auth/login', (res) => {
  let cookie = res.headers['set-cookie'];
  if (cookie) cookie = cookie[0].split(';')[0];
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const csrfMatch = data.match(/name="_csrf" value="([^"]+)"/);
    if (!csrfMatch) return console.log('No CSRF token found');
    
    console.log('Got CSRF Token:', csrfMatch[1]);
  });
});
