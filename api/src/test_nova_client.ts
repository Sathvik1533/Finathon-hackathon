import { NovaClient, NovaClientError } from './novaClient';

async function testNovaClientSuite() {
  console.log('=== TESTING NOVA CLIENT CONTRACT & ERROR HANDLING ===\n');

  // Test 1: Unconfigured client throws CREDENTIAL_REQUIRED
  console.log('[1/6] Testing unconfigured NovaClient...');
  const unconfiguredClient = new NovaClient({ apiKey: '', baseUrl: 'https://www.aczen.in/nova-api/v1' });
  const status1 = unconfiguredClient.getStatus();
  if (status1.configured || status1.mode !== 'unconfigured') {
    throw new Error(`Expected unconfigured status, got: ${JSON.stringify(status1)}`);
  }
  try {
    await unconfiguredClient.fetchPayments();
    throw new Error('Should have thrown when unconfigured');
  } catch (err: any) {
    if (err.code !== 'CREDENTIAL_REQUIRED') throw new Error(`Expected CREDENTIAL_REQUIRED, got: ${err.code}`);
    console.log('  ✓ Unconfigured client correctly rejected with CREDENTIAL_REQUIRED');
  }

  // Test 2: Preflight reachability with mock fetch
  console.log('[2/6] Testing public /health reachability preflight...');
  const reachableClient = new NovaClient({
    apiKey: 'nova_sk_test_key_123456789012345678901234567890123',
    baseUrl: 'https://www.aczen.in/nova-api/v1',
    fetchFn: async (url, init) => {
      if (String(url).endsWith('/health')) {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      }
      return new Response('Not Found', { status: 404 });
    },
  });
  const reachRes = await reachableClient.checkReachability();
  if (!reachRes.reachable || reachRes.status !== 'ok') {
    throw new Error(`Reachability check failed: ${JSON.stringify(reachRes)}`);
  }
  console.log('  ✓ Public /health preflight successfully validated');

  // Test 3: Authenticated /me check returns team_slot & dataset_slice
  console.log('[3/6] Testing authenticated /me preflight...');
  const authClient = new NovaClient({
    apiKey: 'nova_sk_valid_key_0987654321098765432109876543210',
    baseUrl: 'https://www.aczen.in/nova-api/v1',
    fetchFn: async (url, init) => {
      const auth = (init?.headers as any)?.Authorization;
      if (auth && auth.includes('nova_sk_valid_key')) {
        return new Response(JSON.stringify({
          team_slot: 'fin11-team-alpha',
          dataset_slice: 'slice-mumbai-retail-2026',
        }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), { status: 401 });
    },
  });
  const authRes = await authClient.checkAuthentication();
  if (!authRes.authenticated || authRes.teamSlot !== 'fin11-team-alpha') {
    throw new Error(`Authentication check failed: ${JSON.stringify(authRes)}`);
  }
  console.log('  ✓ /me preflight authenticated: team_slot=fin11-team-alpha, dataset_slice=slice-mumbai-retail-2026');

  // Test 4: Rate limit 429 handling with Retry-After
  console.log('[4/6] Testing 429 rate limit backoff...');
  let attemptCount = 0;
  const rateLimitClient = new NovaClient({
    apiKey: 'nova_sk_rate_limit_key_12345678901234567890123456',
    baseUrl: 'https://www.aczen.in/nova-api/v1',
    fetchFn: async (url) => {
      attemptCount++;
      if (attemptCount === 1) {
        return new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'retry-after': '1' },
        });
      }
      return new Response(JSON.stringify({
        data: [{ payment_id: 'p_rl', order_id: 'ORD-RL', amount: 50000 }],
        pagination: { has_more: false },
      }), { status: 200 });
    },
  });
  const payments = await rateLimitClient.fetchPayments();
  if (payments.length !== 1 || payments[0].order_id !== 'ORD-RL') {
    throw new Error('Rate limit retry failed to retrieve records');
  }
  console.log(`  ✓ 429 rate limit handled gracefully with retry (attempts: ${attemptCount})`);

  // Test 5: Secret redaction in error messages
  console.log('[5/6] Testing secret redaction in error logging...');
  const rawSecret = 'nova_sk_sensitive_secret_value_12345678901234567890';
  const err = new NovaClientError(`Failed to fetch for key ${rawSecret}`);
  if (err.message.includes('sensitive_secret_value')) {
    throw new Error('Secret was NOT redacted from error message!');
  }
  if (!err.message.includes('nova_sk_REDACTED')) {
    throw new Error('Redacted marker missing from error message');
  }
  console.log('  ✓ API key secret string successfully redacted from error message');

  // Test 6: Safe failure on invalid key
  console.log('[6/6] Testing invalid key rejection...');
  const invalidKeyClient = new NovaClient({
    apiKey: 'nova_sk_invalid_bogus_key_999999999999999999999999',
    baseUrl: 'https://www.aczen.in/nova-api/v1',
    fetchFn: async () => new Response(JSON.stringify({ error: { message: 'Invalid API key' } }), { status: 401 }),
  });
  const invalidAuthRes = await invalidKeyClient.checkAuthentication();
  if (invalidAuthRes.authenticated) {
    throw new Error('Invalid key should not authenticate');
  }
  console.log('  ✓ Invalid key rejected with clean authenticated=false status');

  console.log('\n=============================================================');
  console.log('  ✓ ALL 6 NOVA CLIENT PROVIDER CONTRACT CHECKS PASSED!');
  console.log('=============================================================\n');
}

testNovaClientSuite().catch((err) => {
  console.error('Nova client test suite failed:', err);
  process.exit(1);
});
