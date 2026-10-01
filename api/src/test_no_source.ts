import app from './server';
import { generateToken } from './auth';
import { novaClient } from './novaClient';
import { setupTestFixtures } from './test_fixtures';

function callRoute(req: { method: string; url: string; headers?: Record<string, string>; body?: any }): Promise<{ status: number; data: any }> {
  return new Promise((resolve) => {
    let statusCode = 200;
    const headers: Record<string, any> = {};
    const res: any = {
      statusCode: 200,
      headers,
      status(code: number) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      setHeader(key: string, val: any) {
        headers[key.toLowerCase()] = val;
        return this;
      },
      getHeader(key: string) {
        return headers[key.toLowerCase()];
      },
      removeHeader(key: string) {
        delete headers[key.toLowerCase()];
      },
      write() {
        return true;
      },
      json(data: any) {
        resolve({ status: statusCode, data });
      },
      send(data: any) {
        resolve({ status: statusCode, data });
      },
      end(data?: any) {
        resolve({ status: statusCode, data });
      },
      emit() {},
      on() {
        return this;
      },
      once() {
        return this;
      },
    };
    (app as any).handle(req, res);
  });
}

async function runNoSourceTests() {
  console.log('=== TESTING DEFAULT UNCONFIGURED NOVA SOURCE CONTRACT ===\n');

  // Step 1: Ensure fixture data is cleared and source is unconfigured
  novaClient.setFixtureData(null);
  const status = novaClient.getStatus();
  console.log(`[1/9] Verifying default unconfigured state...`);
  if (status.configured !== false || status.mode !== 'unconfigured') {
    throw new Error(`Expected configured=false, mode=unconfigured, got configured=${status.configured}, mode=${status.mode}`);
  }
  console.log(`  ✓ Default status is truthful: configured=false, mode=unconfigured`);

  const token = generateToken({
    userId: 'user_operator',
    username: 'admin',
    role: 'admin',
    merchantId: 'm_operator_finops',
  });
  const authHeaders = { authorization: `Bearer ${token}` };

  // Step 2: GET /api/nova/status
  console.log(`[2/9] Testing GET /api/nova/status in unconfigured mode...`);
  const statusRes = await callRoute({ method: 'GET', url: '/api/nova/status' });
  if (statusRes.status !== 200 || statusRes.data.configured !== false) {
    throw new Error(`Expected status 200 with configured=false, got ${statusRes.status}`);
  }
  console.log(`  ✓ /api/nova/status reports configured=false, mode=unconfigured`);

  // Step 3: GET /api/payments -> 503
  console.log(`[3/9] Testing GET /api/payments in unconfigured mode...`);
  const paymentsRes = await callRoute({ method: 'GET', url: '/api/payments', headers: authHeaders });
  if (paymentsRes.status !== 503 || paymentsRes.data.code !== 'SOURCE_UNAVAILABLE') {
    throw new Error(`Expected 503 SOURCE_UNAVAILABLE, got ${paymentsRes.status}: ${JSON.stringify(paymentsRes.data)}`);
  }
  console.log(`  ✓ /api/payments returned HTTP 503 SOURCE_UNAVAILABLE`);

  // Step 4: GET /api/gateway-transactions -> 503
  console.log(`[4/9] Testing GET /api/gateway-transactions in unconfigured mode...`);
  const gwRes = await callRoute({ method: 'GET', url: '/api/gateway-transactions', headers: authHeaders });
  if (gwRes.status !== 503 || gwRes.data.code !== 'SOURCE_UNAVAILABLE') {
    throw new Error(`Expected 503 SOURCE_UNAVAILABLE, got ${gwRes.status}`);
  }
  console.log(`  ✓ /api/gateway-transactions returned HTTP 503 SOURCE_UNAVAILABLE`);

  // Step 5: GET /api/bank-transactions -> 503
  console.log(`[5/9] Testing GET /api/bank-transactions in unconfigured mode...`);
  const bankRes = await callRoute({ method: 'GET', url: '/api/bank-transactions', headers: authHeaders });
  if (bankRes.status !== 503 || bankRes.data.code !== 'SOURCE_UNAVAILABLE') {
    throw new Error(`Expected 503 SOURCE_UNAVAILABLE, got ${bankRes.status}`);
  }
  console.log(`  ✓ /api/bank-transactions returned HTTP 503 SOURCE_UNAVAILABLE`);

  // Step 6: GET /api/settlements -> 503
  console.log(`[6/9] Testing GET /api/settlements in unconfigured mode...`);
  const settlRes = await callRoute({ method: 'GET', url: '/api/settlements', headers: authHeaders });
  if (settlRes.status !== 503 || settlRes.data.code !== 'SOURCE_UNAVAILABLE') {
    throw new Error(`Expected 503 SOURCE_UNAVAILABLE, got ${settlRes.status}`);
  }
  console.log(`  ✓ /api/settlements returned HTTP 503 SOURCE_UNAVAILABLE`);

  // Step 7: POST /api/reconcile/run -> 503
  console.log(`[7/9] Testing POST /api/reconcile/run in unconfigured mode...`);
  const reconRes = await callRoute({ method: 'POST', url: '/api/reconcile/run', headers: authHeaders });
  if (reconRes.status !== 503 || reconRes.data.code !== 'SOURCE_UNAVAILABLE') {
    throw new Error(`Expected 503 SOURCE_UNAVAILABLE, got ${reconRes.status}`);
  }
  console.log(`  ✓ /api/reconcile/run blocked with HTTP 503 SOURCE_UNAVAILABLE`);

  // Step 8: GET /api/reconcile/analytics -> 503
  console.log(`[8/9] Testing GET /api/reconcile/analytics in unconfigured mode...`);
  const analyticsRes = await callRoute({ method: 'GET', url: '/api/reconcile/analytics', headers: authHeaders });
  if (analyticsRes.status !== 503 || analyticsRes.data.code !== 'SOURCE_UNAVAILABLE') {
    throw new Error(`Expected 503 SOURCE_UNAVAILABLE, got ${analyticsRes.status}`);
  }
  console.log(`  ✓ /api/reconcile/analytics returned HTTP 503 SOURCE_UNAVAILABLE`);

  // Step 9: Production Fixture Prohibition Check
  console.log(`[9/9] Verifying that fixtures CANNOT be selected in NODE_ENV=production...`);
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    let threw = false;
    try {
      setupTestFixtures();
    } catch (e: any) {
      threw = true;
      console.log(`  ✓ setupTestFixtures() correctly threw in production: ${e.message}`);
    }
    if (!threw) {
      throw new Error('CRITICAL BUG: setupTestFixtures() did not throw in NODE_ENV=production');
    }

    let threwClient = false;
    try {
      novaClient.setFixtureData({ payments: [] });
    } catch (e: any) {
      threwClient = true;
      console.log(`  ✓ novaClient.setFixtureData() correctly threw in production: ${e.message}`);
    }
    if (!threwClient) {
      throw new Error('CRITICAL BUG: novaClient.setFixtureData() did not throw in NODE_ENV=production');
    }
  } finally {
    process.env.NODE_ENV = originalEnv;
  }

  console.log('\n=============================================================');
  console.log('  ✓ ALL 9 NO-SOURCE CONTRACT & PRODUCTION GUARD CHECKS PASSED!');
  console.log('=============================================================\n');
}

runNoSourceTests().catch((err) => {
  console.error('No-source test failed:', err);
  process.exit(1);
});
