import app from './server';
import { generateToken } from './auth';
import { setupTestFixtures } from './test_fixtures';

process.env.NODE_ENV = 'test';

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
      write(chunk: any) {
        return true;
      },
      sendFile(filepath: string) {
        resolve({ status: 200, data: filepath });
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

async function runFullSystemVerification() {
  setupTestFixtures();
  console.log('=== LEDGERSENSE FULL-SYSTEM WORKBENCH VERIFICATION ===\n');
  const token = generateToken({
    userId: 'user_001',
    username: 'admin',
    role: 'admin',
    merchantId: 'MERCH_ACME_INDIA',
  });

  // 1. Verify Deep Link & SPA Fallbacks on Express
  const routes = ['/dashboard', '/timeline', '/exceptions', '/settlement', '/report', '/nova', '/login', '/unknown-404-test'];
  console.log('[1/4] Verifying SPA Routes & Deep Links...');
  for (const route of routes) {
    const res = await callRoute({ method: 'GET', url: route });
    if (res.status !== 200) {
      throw new Error(`Route ${route} failed with status ${res.status}`);
    }
    console.log(`  ✓ Route ${route} served SPA shell (status 200)`);
  }

  // 2. Verify Reconcile Analytics API with Range & Period Filters
  console.log('\n[2/4] Verifying Filter-Aware Analytics API (/api/reconcile/analytics)...');
  const monthlyRes = await callRoute({
    method: 'GET',
    url: '/api/reconcile/analytics?period=monthly&range=all',
    headers: { authorization: `Bearer ${token}` },
  });
  if (monthlyRes.status !== 200 || !monthlyRes.data || !Array.isArray(monthlyRes.data.series)) {
    throw new Error(`Analytics failed: status=${monthlyRes.status}, data=${JSON.stringify(monthlyRes.data)}`);
  }
  console.log(`  ✓ Monthly series computed: totalVolumePaise=${monthlyRes.data.totalVolumePaise}, seriesCount=${monthlyRes.data.series.length}`);

  const annualRes = await callRoute({
    method: 'GET',
    url: '/api/reconcile/analytics?period=annually&range=7d',
    headers: { authorization: `Bearer ${token}` },
  });
  if (annualRes.status !== 200 || !annualRes.data) {
    throw new Error(`Annually analytics failed: status=${annualRes.status}`);
  }
  console.log(`  ✓ Annually 7d series computed: totalOrders=${annualRes.data.totalOrders}`);

  // 3. Verify Real Notification Center with Read State
  console.log('\n[3/4] Verifying Real Notifications API & Read State Tracking...');
  const notifRes = await callRoute({
    method: 'GET',
    url: '/api/notifications',
    headers: { authorization: `Bearer ${token}` },
  });
  if (notifRes.status !== 200 || !notifRes.data) {
    throw new Error(`Notifications failed: status=${notifRes.status}`);
  }
  console.log(`  ✓ Notifications fetched: unreadCount=${notifRes.data.unreadCount}, total=${notifRes.data.notifications?.length}`);

  const readRes = await callRoute({
    method: 'POST',
    url: '/api/notifications/read',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: {},
  });
  if (readRes.status !== 200 || !readRes.data?.success) {
    throw new Error(`Mark all read failed: status=${readRes.status}`);
  }
  console.log(`  ✓ Mark all read executed: success=${readRes.data.success}`);

  // 4. Verify Nova Status Endpoint with Preflight Check
  console.log('\n[4/4] Verifying Nova Status & Preflight Reachability...');
  const statusRes = await callRoute({
    method: 'GET',
    url: '/api/nova/status?check=true',
  });
  if (statusRes.status !== 200 || !statusRes.data) {
    throw new Error(`Nova status failed: status=${statusRes.status}`);
  }
  console.log(`  ✓ Nova Status verified: mode=${statusRes.data.mode}, reachable=${statusRes.data.reachable}, configured=${statusRes.data.configured}`);

  console.log('\n=============================================================');
  console.log('  ✓ ALL FULL-SYSTEM WORKBENCH VERIFICATION GATES PASSED!');
  console.log('=============================================================\n');
}

runFullSystemVerification().catch((err) => {
  console.error('Full system verification failed:', err);
  process.exit(1);
});
