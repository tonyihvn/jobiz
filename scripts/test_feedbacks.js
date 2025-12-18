(async () => {
  try {
    const loginRes = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'super@omnisales.com', password: 'super' })
    });
    console.log('login_status', loginRes.status);
    const loginBody = await loginRes.json();
    console.log('login_body', loginBody);
    if (!loginBody.token) process.exit(1);
    const token = loginBody.token;
    console.log('got_token', token.slice(0, 20) + '...');

    const r = await fetch('http://localhost:3001/api/super-admin/feedbacks', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('feedbacks_status', r.status);
    const data = await r.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('error', e);
    process.exit(1);
  }
})();
