// Comprehensive safety & live status verification script for deployed Vercel application
const https = require('https');

const ORIGIN = process.env.DEPLOYED_URL || 'https://finathon-ledgersense-web.vercel.app';

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
  console.log(` AUDITING DEPLOYED ENVIRONMENT: ${ORIGIN}`);
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

  // 2. Truthful Health & Dependency Reporting
  console.log(`\n[2/5] Truthful Health & Diagnostic Reporting...`);
  const healthRes = await request('/api/health');
  assert(healthRes.headers['content-type']?.includes('application/json'), 'GET /api/health returned JSON');
  assert(healthRes.status === 503 || healthRes.status === 200, `GET /api/health returned valid status: ${healthRes.status}`);
  const healthJson = JSON.parse(healthRes.body);
  
  if (healthJson.status === 'degraded') {
    assert(healthRes.status === 503, 'GET /api/health returned truthful HTTP 503 when dependencies are unconfigured');
    assert(healthJson.database?.ok === false, 'Database ok is truthfully false when unconfigured');
    assert(healthJson.nova?.configured === false, 'Nova configured is truthfully false when unconfigured');
    assert(healthJson.nova?.mode === 'unconfigured', 'Nova mode is truthfully unconfigured');
    assert(!healthRes.body.includes('password') && !healthRes.body.includes('postgres://'), 'No database credentials or passwords exposed in health response');
  } else {
    assert(healthRes.status === 200, 'GET /api/health returned HTTP 200 when dependencies are healthy');
    assert(healthJson.database?.ok === true, 'Database is healthy');
    assert(healthJson.nova?.configured === true, 'Nova is configured');
  }

  // 3. Strict Backend Authentication & Fail-Closed Safety
  console.log(`\n[3/5] Authentication & Session Management Safety...`);
  // Bad password / unauthenticated
  const badLogin = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }),
  });
  assert(badLogin.status === 401, 'Invalid password or unconfigured auth rejected with HTTP 401');
  const badLoginJson = JSON.parse(badLogin.body);
  assert(badLoginJson.error !== undefined, 'Structured error message returned on failed auth');

  // Missing session
  const unauthMe = await request('/api/auth/me');
  assert(unauthMe.status === 401, 'Unauthenticated GET /api/auth/me rejected with HTTP 401');

  // Check login with configured credentials if available
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: process.env.OPERATOR_USER || 'admin', password: process.env.OPERATOR_PASS || 'admin123' }),
  });

  if (loginRes.status === 200) {
    const loginJson = JSON.parse(loginRes.body);
    assert(typeof loginJson.token === 'string', 'Received valid JWT token on configured environment');
    const token = loginJson.token;

    // Session validation
    const meRes = await request('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    assert(meRes.status === 200, 'GET /api/auth/me with Bearer token returned HTTP 200');

    // Logout
    const logoutRes = await request('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    assert(logoutRes.status === 200, 'POST /api/auth/logout returned HTTP 200');

    // Revocation check
    const postLogoutMe = await request('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    assert(postLogoutMe.status === 401, 'Revoked token rejected with HTTP 401 on /api/auth/me');
  } else {
    console.log('  ℹ Production authentication correctly fails closed when JWT_SECRET/ADMIN_PASSWORD are not configured on Vercel.');
    assert(loginRes.status === 401, 'Unconfigured production authentication fails closed with HTTP 401');
  }

  // 4. Source Feeds & Reconciliation Engine Fail-Closed Verification
  console.log(`\n[4/5] Source Feeds & Reconciliation Engine Fail-Closed Safety...`);
  const novaStatus = await request('/api/nova/status');
  assert(novaStatus.status === 200, 'GET /api/nova/status returned HTTP 200 JSON');
  const novaJson = JSON.parse(novaStatus.body);
  assert(novaJson.configured === false, 'Nova status truthfully reports configured=false');
  assert(novaJson.mode === 'unconfigured', 'Nova status truthfully reports mode=unconfigured');

  const unauthRecon = await request('/api/reconcile/run', { method: 'POST' });
  assert(unauthRecon.status === 401 || unauthRecon.status === 503, 'Unauthenticated reconciliation rejected safely');

  // 5. Security & Content-Type Integrity
  console.log(`\n[5/5] Security Headers & Content-Type Integrity...`);
  const unknownApi = await request('/api/non-existent-route');
  assert(unknownApi.status === 404, 'Unknown /api/* route returns HTTP 404');
  assert(unknownApi.headers['content-type']?.includes('application/json'), 'Unknown /api/* route returns JSON (no SPA HTML leak)');

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
