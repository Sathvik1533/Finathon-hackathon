// Comprehensive verification script for deployed Vercel application
const https = require('https');

const ORIGIN = 'https://finathon-ledgersense-web.vercel.app';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, ORIGIN);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runAudit() {
  console.log(`\n===============================================================`);
  console.log(` AUDITING LIVE DEPLOYMENT: ${ORIGIN}`);
  console.log(`===============================================================\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Direct Page Routing (SPA deep-links)
  console.log(`[1/5] Direct Page Route & SPA Fallback Checks...`);
  const routes = ['/', '/login', '/dashboard', '/timeline', '/sources', '/exceptions', '/settlements', '/report'];
  for (const r of routes) {
    const res = await request(r);
    assert(res.status === 200, `Route ${r} returned HTTP 200 OK`);
    assert(res.headers['content-type']?.includes('text/html'), `Route ${r} returned text/html`);
    assert(res.body.includes('<div id="root"></div>'), `Route ${r} contains root mount point`);
  }

  // 2. Health & Diagnostic API
  console.log(`\n[2/5] Health & Diagnostic Endpoints...`);
  const healthRes = await request('/api/health');
  assert(healthRes.status === 200, 'GET /api/health returned HTTP 200');
  assert(healthRes.headers['content-type']?.includes('application/json'), 'GET /api/health returned JSON');
  const healthJson = JSON.parse(healthRes.body);
  assert(healthJson.status === 'healthy', 'Health status is healthy');
  assert(healthJson.nova?.configured === false, 'Nova configured is truthfully false');
  assert(healthJson.nova?.mode === 'unconfigured', 'Nova mode is truthfully unconfigured');

  // 3. Strict Backend Authentication & Fail-Closed Guards
  console.log(`\n[3/5] Authentication & Session Management...`);
  // Bad password
  const badLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
  });
  assert(badLogin.status === 401, 'Invalid password rejected with HTTP 401');
  assert(JSON.parse(badLogin.body).error === 'Invalid username or password.', 'Exact error message returned');

  // Missing session
  const unauthMe = await request('/api/auth/me');
  assert(unauthMe.status === 401, 'Unauthenticated GET /api/auth/me rejected with HTTP 401');

  // Successful login
  const goodLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  assert(goodLogin.status === 200, 'Valid login returned HTTP 200');
  const loginJson = JSON.parse(goodLogin.body);
  assert(typeof loginJson.token === 'string' && loginJson.token.length > 20, 'Received valid JWT token');
  assert(loginJson.user?.username === 'admin', 'User object matches authenticated admin');
  const token = loginJson.token;

  // Session validation (/api/auth/me)
  const meRes = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(meRes.status === 200, 'GET /api/auth/me with Bearer token returned HTTP 200');
  const meJson = JSON.parse(meRes.body);
  assert(meJson.user?.username === 'admin', 'Validated active session matches user admin');

  // Logout & Revocation
  const logoutRes = await request('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(logoutRes.status === 200, 'POST /api/auth/logout returned HTTP 200');

  // Verify revoked session
  const postLogoutMe = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(postLogoutMe.status === 401, 'Revoked token immediately rejected with HTTP 401 on /api/auth/me');
  assert(JSON.parse(postLogoutMe.body).error.includes('Session has been invalidated'), 'Revocation message returned');

  // 4. Notifications & Alerts State
  console.log(`\n[4/5] Notifications API & Mark-Read Lifecycle...`);
  // Login fresh session
  const login2 = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const token2 = JSON.parse(login2.body).token;

  const notifRes = await request('/api/notifications', {
    headers: { Authorization: `Bearer ${token2}` },
  });
  assert(notifRes.status === 200, 'GET /api/notifications returned HTTP 200');
  const notifJson = JSON.parse(notifRes.body);
  assert(typeof notifJson.unreadCount === 'number', 'unreadCount is a valid number');
  assert(Array.isArray(notifJson.notifications), 'notifications is a valid array');

  const readRes = await request('/api/notifications/read', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token2}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert(readRes.status === 200, 'POST /api/notifications/read returned HTTP 200');
  assert(JSON.parse(readRes.body).success === true, 'Mark all notifications read succeeded');

  // 5. Source Truth & Fail-Closed Reconciliation
  console.log(`\n[5/5] Source Feeds & Reconciliation Engine Fail-Closed Safety...`);
  const novaStatus = await request('/api/nova/status');
  assert(novaStatus.status === 200, 'GET /api/nova/status returned HTTP 200');
  const novaJson = JSON.parse(novaStatus.body);
  assert(novaJson.configured === false, 'Nova configured is strictly false');
  assert(novaJson.mode === 'unconfigured', 'Nova mode is strictly unconfigured');

  const reconRun = await request('/api/reconcile/run', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token2}` },
  });
  assert(reconRun.status === 503, 'POST /api/reconcile/run fails closed with HTTP 503 when source unconfigured');
  const reconJson = JSON.parse(reconRun.body);
  assert(reconJson.code === 'SOURCE_UNAVAILABLE', 'Reconciliation returns code SOURCE_UNAVAILABLE');
  assert(reconJson.sourceState === 'unconfigured', 'Reconciliation reports sourceState unconfigured');

  // Clean-up logout
  await request('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token2}` },
  });

  console.log(`\n===============================================================`);
  console.log(` AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`===============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
