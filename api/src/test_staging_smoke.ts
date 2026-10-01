import { novaClient } from './novaClient';
import { config } from './config';

async function runStagingSmokeTest() {
  console.log('=== STAGING LIVE PROVIDER SMOKE VERIFICATION ===\n');

  const apiKey = process.env.NOVA_API_KEY || config.novaApiKey;
  if (!apiKey || apiKey.trim().length === 0) {
    console.log('[STAGING SMOKE BLOCKED]');
    console.log('  Reason: NOVA_API_KEY is not configured in this environment.');
    console.log('  Status: Acceptance BLOCKED (truthful reporting: live provider integration cannot be faked).');
    console.log('  Action for owner: Configure NOVA_API_KEY privately in host environment (e.g. Railway or local .env).');
    console.log('  Contract: Provider base URL = https://www.aczen.in/nova-api/v1');
    console.log('  Required scopes: /payments, /gateway-transactions, /bank-transactions, /settlements');
    console.log('\nResult: SAFELY_BLOCKED_UNCONFIGURED (No fake data injected)');
    return;
  }

  // Sanitize key display
  const keyPrefix = apiKey.slice(0, 8);
  console.log(`[1/4] Found configured key (prefix: ${keyPrefix}REDACTED)...`);

  // Reachability check
  console.log('[2/4] Testing upstream reachability...');
  const reachability = await novaClient.checkReachability(6000);
  console.log(`  Upstream reachable: ${reachability.reachable}`);

  // Authentication check
  console.log('[3/4] Testing upstream authenticated identity (/me)...');
  const auth = await novaClient.checkAuthentication(6000);
  if (!auth.authenticated) {
    console.log(`  ✗ Upstream authentication failed: ${auth.error}`);
    throw new Error(`Upstream authentication failed: ${auth.error}`);
  }
  console.log(`  ✓ Authenticated with provider: teamSlot=${auth.teamSlot || 'N/A'}, slice=${auth.datasetSlice || 'N/A'}`);

  // Small read-only fetch
  console.log('[4/4] Performing small read-only verification fetch...');
  const payments = await novaClient.fetchPayments();
  console.log(`  ✓ Read-only fetch succeeded: ${payments.length} provider records retrieved.`);
  console.log('=== STAGING SMOKE TEST PASSED ON LIVE DATA ===\n');
}

runStagingSmokeTest().catch((err) => {
  console.error('Staging smoke check encountered an error:', err.message);
  process.exit(1);
});
