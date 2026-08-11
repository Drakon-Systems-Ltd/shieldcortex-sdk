import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectRequest, makeClient, mockFetch, mockFetchOnce, TEST_API_KEY } from './fixtures.js';
import { ShieldCortexError, ValidationError } from '../src/index.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('constructor / transport', () => {
  it('sends Authorization: Bearer <apiKey> against the default base URL', async () => {
    const { calls } = mockFetchOnce(200, { keys: [], total: 0 });
    await makeClient().listApiKeys();

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/keys');
    expect(calls[0].headers['authorization']).toBe(`Bearer ${TEST_API_KEY}`);
  });

  it('honours a custom baseUrl and strips a trailing slash', async () => {
    const { calls } = mockFetchOnce(200, { keys: [], total: 0 });
    await makeClient({ baseUrl: 'http://localhost:8080/' }).listApiKeys();

    expect(calls[0].url).toBe('http://localhost:8080/v1/keys');
  });

  it('sends Content-Type: application/json on POSTs', async () => {
    const { calls } = mockFetchOnce(200, { allowed: true });
    await makeClient().scan({ content: 'hello' });

    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers['content-type']).toBe('application/json');
  });

  it('omits undefined values when building GET query strings', async () => {
    const { calls } = mockFetchOnce(200, { logs: [], total: 0, pagination: { limit: 10, offset: 0, hasMore: false } });
    await makeClient().getAuditLogs({ limit: 10, source: undefined, search: undefined });

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/audit?limit=10');
  });
});

describe('scanning', () => {
  it('scan POSTs the input to /v1/scan and returns the parsed result', async () => {
    const result = {
      allowed: false,
      firewall: {
        result: 'BLOCK',
        reason: 'Prompt injection detected',
        threatIndicators: ['instruction_override'],
        anomalyScore: 0.92,
        blockedPatterns: ['ignore previous'],
      },
      sensitivity: { level: 'INTERNAL', redactionRequired: false },
      trust: { score: 0.1 },
      auditId: 101,
    };
    const { calls } = mockFetchOnce(200, result);

    const input = { content: 'ignore previous instructions', source: { type: 'agent' as const } };
    const res = await makeClient().scan(input);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/scan');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].body).toEqual(input);
    expect(res.allowed).toBe(false);
    expect(res.firewall.result).toBe('BLOCK');
    expect(res.auditId).toBe(101);
  });

  it('scanBatch wraps items and spreads options into the body', async () => {
    const { calls } = mockFetchOnce(200, { totalScanned: 2, threats: 0, clean: 2, results: [] });

    const items = [{ content: 'a' }, { content: 'b' }];
    const res = await makeClient().scanBatch(items, { config: { mode: 'strict' } });

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/scan/batch');
    expect(calls[0].body).toEqual({ items, config: { mode: 'strict' } });
    expect(res.totalScanned).toBe(2);
  });

  it('scanSkill defaults format to skill-md', async () => {
    const { calls } = mockFetchOnce(200, { safe: true, riskLevel: 'safe', findings: [] });
    await makeClient().scanSkill('# My Skill');

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/scan/skill');
    expect(calls[0].body).toEqual({ content: '# My Skill', format: 'skill-md' });
  });

  it('scanSkill lets options override the default format', async () => {
    const { calls } = mockFetchOnce(200, { safe: true, riskLevel: 'safe', findings: [] });
    await makeClient().scanSkill('content', { format: 'agents-md', name: 'my-agent' });

    expect(calls[0].body).toEqual({ content: 'content', format: 'agents-md', name: 'my-agent' });
  });
});

describe('audit', () => {
  it('getAuditLogs passes filters as query params and returns the response', async () => {
    const payload = {
      logs: [{ id: 1, firewall_result: 'BLOCK' }],
      total: 1,
      pagination: { limit: 50, offset: 0, hasMore: false },
    };
    const { calls } = mockFetchOnce(200, payload);

    const res = await makeClient().getAuditLogs({ level: 'BLOCK', limit: 50, offset: 0 });

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/audit?level=BLOCK&limit=50&offset=0');
    expect(calls[0].method).toBe('GET');
    expect(res.logs).toHaveLength(1);
    expect(res.pagination.hasMore).toBe(false);
  });

  it('getAuditEntry hits /v1/audit/:id', async () => {
    const { calls } = mockFetchOnce(200, { id: 42, firewallResult: 'ALLOW' });
    const res = await makeClient().getAuditEntry(42);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/audit/42');
    expect(res.id).toBe(42);
  });

  it('getAuditStats without timeRange sends no query string', async () => {
    const { calls } = mockFetchOnce(200, { totalOperations: 5, allowedCount: 4, blockedCount: 1, quarantinedCount: 0 });
    const res = await makeClient().getAuditStats();

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/audit/stats');
    expect(res.totalOperations).toBe(5);
  });

  it('getAuditStats with timeRange sends ?timeRange=', async () => {
    const { calls } = mockFetchOnce(200, { totalOperations: 0 });
    await makeClient().getAuditStats('7d');

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/audit/stats?timeRange=7d');
  });
});

describe('quarantine', () => {
  it('getQuarantine passes status filter and returns items', async () => {
    const { calls } = mockFetchOnce(200, { items: [{ id: 9, status: 'pending' }], total: 1 });
    const res = await makeClient().getQuarantine({ status: 'pending' });

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/quarantine?status=pending');
    expect(res.items[0].id).toBe(9);
  });

  it('reviewQuarantine POSTs the action and resolves void', async () => {
    const { calls } = mockFetchOnce(200, { success: true });
    const res = await makeClient().reviewQuarantine(9, 'approve');

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/quarantine/9/review');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].body).toEqual({ action: 'approve' });
    expect(res).toBeUndefined();
  });
});

describe('api keys', () => {
  it('createApiKey POSTs the input and returns the key material', async () => {
    const payload = {
      message: 'created',
      key: 'sc_live_new123',
      keyInfo: { id: 7, name: 'ci', scopes: ['scan'] },
    };
    const { calls } = mockFetchOnce(200, payload);

    const res = await makeClient().createApiKey({ name: 'ci', scopes: ['scan'] });

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/keys');
    expect(calls[0].body).toEqual({ name: 'ci', scopes: ['scan'] });
    expect(res.key).toBe('sc_live_new123');
    expect(res.keyInfo.id).toBe(7);
  });

  it('listApiKeys GETs /v1/keys', async () => {
    const { calls } = mockFetchOnce(200, { keys: [{ id: 1, name: 'default', prefix: 'sc_live_ab', scopes: [], revoked: false }], total: 1 });
    const res = await makeClient().listApiKeys();

    expect(calls[0].method).toBe('GET');
    expect(res.keys[0].prefix).toBe('sc_live_ab');
  });

  it('revokeApiKey DELETEs /v1/keys/:id and resolves void', async () => {
    const { calls } = mockFetchOnce(200, {});
    const res = await makeClient().revokeApiKey(3);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/keys/3');
    expect(calls[0].method).toBe('DELETE');
    expect(calls[0].rawBody).toBeUndefined();
    expect(res).toBeUndefined();
  });
});

describe('teams', () => {
  it('getTeam GETs /v1/teams', async () => {
    const { calls } = mockFetchOnce(200, { id: 2, name: 'Drakon', slug: 'drakon', plan: 'free', scanLimit: 500 });
    const res = await makeClient().getTeam();

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/teams');
    expect(res.plan).toBe('free');
  });

  it('updateTeam PATCHes the name', async () => {
    const { calls } = mockFetchOnce(200, {});
    await makeClient().updateTeam('New Name');

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/teams');
    expect(calls[0].method).toBe('PATCH');
    expect(calls[0].body).toEqual({ name: 'New Name' });
  });

  it('getUsage GETs /v1/teams/usage', async () => {
    const { calls } = mockFetchOnce(200, { used: 12, limit: 500, breakdown: { scans: 10, batches: 2, blocked: 1, quarantined: 0 } });
    const res = await makeClient().getUsage();

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/teams/usage');
    expect(res.used).toBe(12);
    expect(res.breakdown.blocked).toBe(1);
  });
});

describe('invites', () => {
  it('createInvite defaults role to member and unwraps { invite }', async () => {
    const invite = { id: 5, email: 'a@b.co', role: 'member', status: 'pending', expiresAt: 'x', createdAt: 'y' };
    const { calls } = mockFetchOnce(200, { invite });

    const res = await makeClient().createInvite('a@b.co');

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/invites');
    expect(calls[0].body).toEqual({ email: 'a@b.co', role: 'member' });
    expect(res).toEqual(invite);
  });

  it('createInvite passes an explicit admin role', async () => {
    const { calls } = mockFetchOnce(200, { invite: { id: 6 } });
    await makeClient().createInvite('c@d.co', 'admin');

    expect(calls[0].body).toEqual({ email: 'c@d.co', role: 'admin' });
  });

  it('deleteInvite DELETEs /v1/invites/:id', async () => {
    const { calls } = mockFetchOnce(200, {});
    const res = await makeClient().deleteInvite(6);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/invites/6');
    expect(calls[0].method).toBe('DELETE');
    expect(res).toBeUndefined();
  });

  it('resendInvite POSTs an empty object body', async () => {
    const { calls } = mockFetchOnce(200, {});
    await makeClient().resendInvite(6);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/invites/6/resend');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].rawBody).toBe('{}');
  });
});

describe('billing', () => {
  it('createCheckoutSession POSTs an empty body and returns the URL', async () => {
    const { calls } = mockFetchOnce(200, { url: 'https://checkout.stripe.com/x' });
    const res = await makeClient().createCheckoutSession();

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/billing/checkout');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].rawBody).toBe('{}');
    expect(res.url).toBe('https://checkout.stripe.com/x');
  });
});

describe('devices', () => {
  it('getDevices unwraps { devices }', async () => {
    const devices = [{ id: 'uuid-1', name: 'Mac', platform: 'darwin', first_seen: 'a', last_seen: 'b', scan_count: 3 }];
    const { calls } = mockFetchOnce(200, { devices });

    const res = await makeClient().getDevices();

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/devices');
    expect(res).toEqual(devices);
  });

  it('registerDevice POSTs snake_case fields', async () => {
    const { calls } = mockFetchOnce(200, {});
    await makeClient().registerDevice('dev-1', { deviceName: 'Mac Studio', platform: 'darwin' });

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/devices');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].body).toEqual({ device_id: 'dev-1', device_name: 'Mac Studio', platform: 'darwin' });
  });

  it('deviceHeartbeat POSTs to /v1/devices/heartbeat, dropping absent optionals', async () => {
    const { calls } = mockFetchOnce(200, {});
    await makeClient().deviceHeartbeat('dev-1');

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/devices/heartbeat');
    // undefined optionals are dropped by JSON.stringify
    expect(calls[0].body).toEqual({ device_id: 'dev-1' });
  });

  it('updateDevice PATCHes /v1/devices/:uuid with the new name', async () => {
    const { calls } = mockFetchOnce(200, {});
    const res = await makeClient().updateDevice('uuid-1', 'Renamed');

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/devices/uuid-1');
    expect(calls[0].method).toBe('PATCH');
    expect(calls[0].body).toEqual({ name: 'Renamed' });
    expect(res).toBeUndefined();
  });
});

describe('alerts', () => {
  it('getAlerts unwraps { rules }', async () => {
    const rules = [{ id: 1, name: 'blocks', enabled: true, trigger_on_block: true, trigger_on_quarantine: false, email_recipients: ['x@y.z'], created_at: 'a' }];
    const { calls } = mockFetchOnce(200, { rules });

    const res = await makeClient().getAlerts();

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/alerts');
    expect(res).toEqual(rules);
  });

  it('createAlert POSTs the rule input', async () => {
    const input = { name: 'blocks', email_recipients: ['x@y.z'], trigger_on_block: true };
    const { calls } = mockFetchOnce(200, { id: 2, ...input });

    const res = await makeClient().createAlert(input);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/alerts');
    expect(calls[0].body).toEqual(input);
    expect(res.id).toBe(2);
  });

  it('deleteAlert DELETEs /v1/alerts/:id', async () => {
    const { calls } = mockFetchOnce(200, {});
    const res = await makeClient().deleteAlert(2);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/alerts/2');
    expect(calls[0].method).toBe('DELETE');
    expect(res).toBeUndefined();
  });
});

describe('webhooks', () => {
  it('createWebhook POSTs name, url and events and returns the secret', async () => {
    const { calls } = mockFetchOnce(200, { id: 3, name: 'wh', url: 'https://x.example', secret: 'whsec_1', enabled: true, events: ['scan.blocked'], created_at: 'a' });

    const res = await makeClient().createWebhook('wh', 'https://x.example', ['scan.blocked']);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/webhooks');
    expect(calls[0].body).toEqual({ name: 'wh', url: 'https://x.example', events: ['scan.blocked'] });
    expect(res.secret).toBe('whsec_1');
  });

  it('testWebhook POSTs an empty body to /v1/webhooks/:id/test', async () => {
    const { calls } = mockFetchOnce(200, { success: true, status: 200, duration_ms: 12, message: 'ok' });
    const res = await makeClient().testWebhook(3);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/webhooks/3/test');
    expect(calls[0].rawBody).toBe('{}');
    expect(res.success).toBe(true);
  });

  it('getWebhookDeliveries unwraps { deliveries }', async () => {
    const deliveries = [{ id: 1, event: 'scan.blocked', response_status: 200, success: true, created_at: 'a', duration_ms: 5 }];
    const { calls } = mockFetchOnce(200, { deliveries });

    const res = await makeClient().getWebhookDeliveries(3);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/webhooks/3/deliveries');
    expect(res).toEqual(deliveries);
  });

  it('deleteWebhook DELETEs /v1/webhooks/:id', async () => {
    const { calls } = mockFetchOnce(200, {});
    const res = await makeClient().deleteWebhook(3);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/webhooks/3');
    expect(calls[0].method).toBe('DELETE');
    expect(res).toBeUndefined();
  });
});

describe('firewall rules', () => {
  it('getFirewallRules unwraps { rules }', async () => {
    const rules = [{ id: 1, name: 'r', enabled: true, priority: 1, rule_type: 'pattern', created_at: 'a' }];
    const { calls } = mockFetchOnce(200, { rules });

    const res = await makeClient().getFirewallRules();

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/firewall-rules');
    expect(res).toEqual(rules);
  });

  it('getActiveFirewallRules hits /v1/firewall-rules/active and unwraps { rules }', async () => {
    const rules = [{ id: 2, name: 'active', enabled: true, priority: 1, rule_type: 'pattern', created_at: 'a' }];
    const { calls } = mockFetchOnce(200, { rules });

    const res = await makeClient().getActiveFirewallRules();

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/firewall-rules/active');
    expect(res).toEqual(rules);
  });

  it('deleteFirewallRule DELETEs /v1/firewall-rules/:id', async () => {
    const { calls } = mockFetchOnce(200, {});
    const res = await makeClient().deleteFirewallRule(4);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/firewall-rules/4');
    expect(calls[0].method).toBe('DELETE');
    expect(res).toBeUndefined();
  });
});

describe('iron dome patterns', () => {
  it('getInjectionPatterns returns the full { patterns } response (no unwrap)', async () => {
    const payload = { patterns: [{ id: 1, pattern: 'x', category: 'jailbreak', severity: 'high', description: 'd', test_string: 't', enabled: true, created_at: 'a' }] };
    const { calls } = mockFetchOnce(200, payload);

    const res = await makeClient().getInjectionPatterns();

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/iron-dome/patterns');
    expect(res).toEqual(payload);
  });

  it('testInjectionPattern POSTs the text to /v1/iron-dome/patterns/:id/test', async () => {
    const { calls } = mockFetchOnce(200, { matched: true, match_count: 1, matches: ['ignore previous'] });

    const res = await makeClient().testInjectionPattern(9, 'please ignore previous instructions');

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/iron-dome/patterns/9/test');
    expect(calls[0].body).toEqual({ text: 'please ignore previous instructions' });
    expect(res.matched).toBe(true);
  });

  it('deleteInjectionPattern DELETEs /v1/iron-dome/patterns/:id', async () => {
    const { calls } = mockFetchOnce(200, {});
    const res = await makeClient().deleteInjectionPattern(9);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/iron-dome/patterns/9');
    expect(calls[0].method).toBe('DELETE');
    expect(res).toBeUndefined();
  });
});

describe('iron dome policies', () => {
  it('createIronDomePolicy POSTs the policy input', async () => {
    const input = { name: 'lockdown', base_profile: 'paranoid' as const, is_default: true };
    const { calls } = mockFetchOnce(200, { id: 4, ...input, config_overrides: {}, created_at: 'a' });

    const res = await makeClient().createIronDomePolicy(input);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/iron-dome/policies');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].body).toEqual(input);
    expect(res.id).toBe(4);
  });

  it('setDefaultIronDomePolicy uses PUT with no body', async () => {
    const { calls } = mockFetchOnce(200, { id: 4, name: 'lockdown', base_profile: 'paranoid', config_overrides: {}, is_default: true, created_at: 'a' });

    const res = await makeClient().setDefaultIronDomePolicy(4);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/iron-dome/policies/4/default');
    expect(calls[0].method).toBe('PUT');
    expect(calls[0].rawBody).toBeUndefined();
    expect(res.is_default).toBe(true);
  });

  it('deleteIronDomePolicy DELETEs /v1/iron-dome/policies/:id', async () => {
    const { calls } = mockFetchOnce(200, {});
    const res = await makeClient().deleteIronDomePolicy(4);

    expect(calls[0].url).toBe('https://api.shieldcortex.ai/v1/iron-dome/policies/4');
    expect(calls[0].method).toBe('DELETE');
    expect(res).toBeUndefined();
  });
});

describe('audit trends', () => {
  it('getAuditTrends without a query sends no query string', async () => {
    const payload = { buckets: [{ time: '2026-08-11T09:00:00.000Z', allowed: 5, blocked: 1, quarantined: 0 }], timeRange: '24h' };
    const { calls } = mockFetchOnce(200, payload);

    const res = await makeClient().getAuditTrends();

    expectRequest(calls[0], { method: 'GET', path: '/v1/audit/trends' });
    expect(res.buckets).toHaveLength(1);
    expect(res.timeRange).toBe('24h');
  });

  it('getAuditTrends passes camelCase timeRange plus filters as query params', async () => {
    // Free tier asking for 30d gets 7d-limited data back — response echoes the EFFECTIVE range.
    const { calls } = mockFetchOnce(200, { buckets: [], timeRange: '7d' });

    const res = await makeClient().getAuditTrends({ timeRange: '30d', device_id: 'uuid-1', source: 'hook' });

    expectRequest(calls[0], { method: 'GET', path: '/v1/audit/trends?timeRange=30d&device_id=uuid-1&source=hook' });
    expect(res.timeRange).toBe('7d');
  });
});

describe('audit export (file body)', () => {
  const exportHeaders = {
    'X-ShieldCortex-Export-SHA256': 'ab'.repeat(32),
    'X-ShieldCortex-Export-Count': '2',
    'X-ShieldCortex-Export-Generated-At': '2026-08-11T09:00:00.000Z',
    'X-ShieldCortex-Export-Manifest-Id': 'exp_' + 'cd'.repeat(16),
    'X-ShieldCortex-Export-Signature': 'ef'.repeat(32),
    'X-ShieldCortex-Export-Signature-Alg': 'hmac-sha256',
    'X-ShieldCortex-Export-Manifest-Persisted': '1',
  };

  it('exportAuditLogs defaults to format=json and returns raw body + parsed integrity headers', async () => {
    const body = JSON.stringify([{ id: 1, firewall_result: 'BLOCK' }, { id: 2, firewall_result: 'ALLOW' }]);
    mockFetch(new Response(body, { status: 200, headers: { 'content-type': 'application/json', ...exportHeaders } }));
    const client = makeClient();

    const res = await client.exportAuditLogs();

    expect(res.content).toBe(body);
    expect(res.headers).toEqual({
      sha256: 'ab'.repeat(32),
      count: 2,
      generatedAt: '2026-08-11T09:00:00.000Z',
      manifestId: 'exp_' + 'cd'.repeat(16),
      signature: 'ef'.repeat(32),
      signatureAlgorithm: 'hmac-sha256',
      manifestPersisted: true,
    });
  });

  it('exportAuditLogs sends format + filters and returns CSV text verbatim', async () => {
    const csv = 'id,timestamp,source_type\n"1","2026-08-11T09:00:00.000Z","hook"\n';
    const { calls } = mockFetch(new Response(csv, { status: 200, headers: { 'content-type': 'text/csv', ...exportHeaders } }));

    const res = await makeClient().exportAuditLogs({ format: 'csv', level: 'BLOCK', search: 'sudo' });

    expectRequest(calls[0], { method: 'GET', path: '/v1/audit/export?format=csv&level=BLOCK&search=sudo' });
    expect(res.content).toBe(csv);
  });

  it('exportAuditLogs supports the JSON envelope shape param', async () => {
    const envelope = { meta: { format: 'json', hash_algorithm: 'sha256', entries_sha256: 'ab'.repeat(32), entry_count: 0, generated_at: '2026-08-11T09:00:00.000Z' }, entries: [] };
    const { calls } = mockFetch(new Response(JSON.stringify(envelope), { status: 200, headers: exportHeaders }));

    await makeClient().exportAuditLogs({ format: 'json', shape: 'envelope' });

    expectRequest(calls[0], { method: 'GET', path: '/v1/audit/export?format=json&shape=envelope' });
  });
});

describe('audit ingest', () => {
  const entry = {
    source_type: 'hook',
    source_identifier: 'cortex-memory',
    trust_score: 0.4,
    sensitivity_level: 'INTERNAL',
    firewall_result: 'BLOCK' as const,
    anomaly_score: 0.9,
    threat_indicators: ['instruction_override'],
    reason: 'Prompt injection detected',
    pipeline_duration_ms: 12,
    timestamp: '2026-08-11T09:00:00.000Z',
  };

  it('ingestAuditEvents POSTs { entries } and returns the ingested count', async () => {
    const { calls } = mockFetchOnce(201, { ingested: 1 });

    const res = await makeClient().ingestAuditEvents([entry]);

    expectRequest(calls[0], { method: 'POST', path: '/v1/audit/ingest', body: { entries: [entry] } });
    expect(res.ingested).toBe(1);
  });

  it('ingestAuditEvents surfaces a 402 scan-quota as the generic ShieldCortexError with the camelCase usage body', async () => {
    const quotaBody = {
      error: 'Quota Exceeded',
      message: 'Monthly scan limit reached',
      usage: { scansUsed: 500, scansLimit: 500, requested: 1, remaining: 0 },
    };
    mockFetchOnce(402, quotaBody);

    const err = await makeClient().ingestAuditEvents([entry]).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ShieldCortexError);
    expect(err).not.toBeInstanceOf(ValidationError);
    expect((err as ShieldCortexError).status).toBe(402);
    expect(JSON.parse((err as ShieldCortexError).body)).toEqual(quotaBody);
  });
});

describe('iron dome analytics', () => {
  it('getIronDomeStats passes timeRange + device_id and returns the stats shape', async () => {
    const payload = {
      total_events: 4,
      blocked: 3,
      allowed: 1,
      by_action: { command_block: 3, unknown: 1 },
      top_devices: [{ device_name: 'Mac', device_id: 'uuid-1', count: 4 }],
    };
    const { calls } = mockFetchOnce(200, payload);

    const res = await makeClient().getIronDomeStats({ timeRange: '7d', device_id: 'uuid-1' });

    expectRequest(calls[0], { method: 'GET', path: '/v1/audit/iron-dome/stats?timeRange=7d&device_id=uuid-1' });
    expect(res.by_action['command_block']).toBe(3);
    expect(res.top_devices[0].device_id).toBe('uuid-1');
  });

  it('getIronDomeEvents returns an envelope with pagination but NO total', async () => {
    const payload = {
      events: [{
        id: 1, timestamp: '2026-08-11T09:00:00.000Z', source_type: 'iron-dome', source_identifier: 'iron-dome',
        trust_score: 0.1, sensitivity_level: 'INTERNAL', firewall_result: 'BLOCK', anomaly_score: 0.95,
        threat_indicators: ['privesc'], reason: '[iron-dome:command_block] sudo rm', pipeline_duration_ms: 4,
        device_id: 'uuid-1', device_name: 'Mac', action_type: 'command_block',
      }],
      pagination: { limit: 50, offset: 0, hasMore: false },
    };
    const { calls } = mockFetchOnce(200, payload);

    const res = await makeClient().getIronDomeEvents({ limit: 50 });

    expectRequest(calls[0], { method: 'GET', path: '/v1/audit/iron-dome/events?limit=50' });
    expect(res.events[0].action_type).toBe('command_block');
    expect(res.pagination.hasMore).toBe(false);
    expect('total' in res).toBe(false);
  });
});

describe('audit export manifests', () => {
  const manifest = {
    manifest_id: 'exp_' + 'cd'.repeat(16),
    request_id: 'req_abc123def456',
    api_key_id: 7,
    format: 'json',
    shape: 'array',
    filters: { from: null, to: null, level: 'BLOCK', source: null, device_id: null, search: null },
    entry_count: 2,
    export_sha256: 'ab'.repeat(32),
    signature_algorithm: 'hmac-sha256',
    signature: 'ef'.repeat(32),
    generated_at: '2026-08-11T09:00:00.000Z',
    created_at: '2026-08-11T09:00:00.000Z',
  };

  it('listAuditExports returns { manifests, pagination } with NO total', async () => {
    const { calls } = mockFetchOnce(200, { manifests: [manifest], pagination: { limit: 50, offset: 0, hasMore: false } });

    const res = await makeClient().listAuditExports({ format: 'json', search: 'exp_' });

    expectRequest(calls[0], { method: 'GET', path: '/v1/audit/exports?format=json&search=exp_' });
    expect(res.manifests[0].manifest_id).toBe(manifest.manifest_id);
    expect('total' in res).toBe(false);
  });

  it('getAuditExportManifest returns the manifest (with team_id) plus a server-side verification', async () => {
    const payload = { manifest: { ...manifest, team_id: 2 }, verification: { signature_valid: true, signature_algorithm: 'hmac-sha256' } };
    const { calls } = mockFetchOnce(200, payload);

    const res = await makeClient().getAuditExportManifest(manifest.manifest_id);

    expectRequest(calls[0], { method: 'GET', path: `/v1/audit/exports/${manifest.manifest_id}` });
    expect(res.manifest.team_id).toBe(2);
    expect(res.verification.signature_valid).toBe(true);
  });

  it('verifyAuditExport POSTs the provided digests; sha256_matches is null when none was sent', async () => {
    const payload = {
      manifest_id: manifest.manifest_id,
      verification: { signature_valid: true, sha256_matches: null, signature_algorithm: 'hmac-sha256' },
      expected: { export_sha256: 'ab'.repeat(32), signature: 'ef'.repeat(32) },
    };
    const { calls } = mockFetchOnce(200, payload);

    const res = await makeClient().verifyAuditExport(manifest.manifest_id);

    expectRequest(calls[0], { method: 'POST', path: `/v1/audit/exports/${manifest.manifest_id}/verify`, body: {} });
    expect(res.verification.sha256_matches).toBeNull();
  });

  it('verifyAuditExport passes export_sha256 + signature through', async () => {
    const input = { export_sha256: 'ab'.repeat(32), signature: 'ef'.repeat(32) };
    const { calls } = mockFetchOnce(200, {
      manifest_id: manifest.manifest_id,
      verification: { signature_valid: true, sha256_matches: true, signature_algorithm: 'hmac-sha256' },
      expected: input,
    });

    const res = await makeClient().verifyAuditExport(manifest.manifest_id, input);

    expectRequest(calls[0], { method: 'POST', path: `/v1/audit/exports/${manifest.manifest_id}/verify`, body: input });
    expect(res.verification.sha256_matches).toBe(true);
  });

  it('listAuditExportVerifications returns { events, pagination }; unknown manifests yield an empty 200', async () => {
    const { calls } = mockFetchOnce(200, { events: [], pagination: { limit: 50, offset: 0, hasMore: false } });

    const res = await makeClient().listAuditExportVerifications('exp_unknown', { limit: 50 });

    expectRequest(calls[0], { method: 'GET', path: '/v1/audit/exports/exp_unknown/verifications?limit=50' });
    expect(res.events).toEqual([]);
  });
});
