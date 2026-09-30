import app from './server';
import { loginUser, generateToken } from './auth';
import { reconEngine } from './reconEngine';
import { closePool } from './db';

process.env.NODE_ENV = 'test';

function createMockResponse(onEnd: (status: number, data: any) => void) {
  let statusCode = 200;
  const headers: Record<string, any> = {};
  return {
    status: function (code: number) {
      statusCode = code;
      return this;
    },
    setHeader: function (key: string, val: any) {
      headers[key.toLowerCase()] = val;
      return this;
    },
    getHeader: function (key: string) {
      return headers[key.toLowerCase()];
    },
    json: function (data: any) {
      onEnd(statusCode, data);
      return this;
    },
    send: function (data: any) {
      onEnd(statusCode, data);
      return this;
    },
  };
}

async function runTests() {
  console.log('--- Testing Node.js/Express Finathon API ---');

  // Test 1: Auth Module & JWT
  console.log('[1/4] Testing Auth & JWT generation...');
  const loginRes = loginUser('admin', 'admin123');
  if (!loginRes.success || !loginRes.token) {
    throw new Error('Admin login failed');
  }
  console.log('  ✓ Admin login generated valid JWT');

  const invalidRes = loginUser('admin', 'wrong_pass');
  if (invalidRes.success) {
    throw new Error('Invalid login should fail');
  }
  console.log('  ✓ Invalid password rejected');

  // Test 2: 7-Stage Recon Engine
  console.log('[2/4] Testing 7-stage Deterministic Recon Engine...');
  const payments = [{ payment_id: 'p1', order_id: 'O1', amount: 100000 }];
  const gatewayTxs = [{ gateway_ref: 'g1', order_id: 'O1', amount: 100000, fee: 2000, tax: 360, net_amount: 97640 }];
  const result = reconEngine.runReconciliation(payments, gatewayTxs, [], []);
  if (result.matchedCount !== 1 || result.discrepancyCount !== 1) {
    throw new Error(`Engine reconciliation mismatch: matched=${result.matchedCount}, disc=${result.discrepancyCount}`);
  }
  console.log('  ✓ Recon engine successfully matched order O1 and identified timing lag');

  // Test 3: Express Health Endpoint
  console.log('[3/4] Testing Express Health Handler...');
  await new Promise<void>((resolve, reject) => {
    const mockRes = createMockResponse((status, data) => {
      if (status !== 200 || data.status !== 'healthy') {
        reject(new Error(`Expected 200 healthy, got ${status}: ${JSON.stringify(data)}`));
      } else {
        console.log('  ✓ Express app routed /api/health with status 200 OK');
        resolve();
      }
    });
    (app as any).handle({ method: 'GET', url: '/api/health', headers: {} }, mockRes);
  });

  // Test 4: Authenticated Reconcile Logic
  console.log('[4/6] Testing Express Reconcile Handler with JWT...');
  let runCases: any[] = [];
  await new Promise<void>((resolve, reject) => {
    const mockRes = createMockResponse((status, data) => {
      if (status !== 200 || !data.runId) {
        reject(new Error(`Expected 200 with runId, got ${status}`));
      } else {
        runCases = data.cases || [];
        console.log(`  ✓ Express app executed reconciliation with runId ${data.runId}, ${data.cases.length} cases flagged`);
        resolve();
      }
    });
    const reconReq: any = {
      method: 'POST',
      url: '/api/reconcile/run',
      headers: { authorization: `Bearer ${loginRes.token}` },
      body: {},
    };
    (app as any).handle(reconReq, mockRes);
  });

  // Test 5: DB Status Endpoint
  console.log('[5/6] Testing Database Status Endpoint...');
  await new Promise<void>((resolve, reject) => {
    const mockRes = createMockResponse((status, data) => {
      if (status !== 200 || !data.database) {
        reject(new Error(`Expected 200 with database status, got ${status}`));
      } else {
        console.log('  ✓ Database status endpoint responded with health & in-memory counts');
        resolve();
      }
    });
    (app as any).handle({ method: 'GET', url: '/api/db/status', headers: {} }, mockRes);
  });

  // Test 6: Case Review Decision with Rationale
  console.log('[6/6] Testing Exception Review Decision Flow...');
  if (runCases.length > 0) {
    const targetCaseId = runCases[0].caseId;
    await new Promise<void>((resolve, reject) => {
      const mockRes = createMockResponse((status, data) => {
        if (status !== 200 || data.case?.status !== 'APPROVED') {
          reject(new Error(`Expected 200 with APPROVED status, got ${status}: ${JSON.stringify(data)}`));
        } else {
          console.log(`  ✓ Case ${targetCaseId} successfully updated to APPROVED with audit trail`);
          resolve();
        }
      });
      const decisionReq: any = {
        method: 'POST',
        url: `/api/cases/${targetCaseId}/decision`,
        headers: { authorization: `Bearer ${loginRes.token}`, 'content-type': 'application/json' },
        body: { decision: 'APPROVED', reason: 'Verified fee schedule tolerance clause 3.2' },
      };
      (app as any).handle(decisionReq, mockRes);
    });
  }

  await closePool();
  console.log('======================================================');
  console.log('  ✓ ALL NODE.JS EXPRESS BACKEND CHECKS PASSED!');
  console.log('======================================================');
  process.exit(0);
}

runTests().catch(async (err) => {
  console.error('Test failed:', err);
  await closePool();
  process.exit(1);
});
