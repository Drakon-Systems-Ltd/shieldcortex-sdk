# shieldcortex-sdk

Official TypeScript SDK for the [ShieldCortex](https://shieldcortex.ai) API. Scan AI agent memory and inputs for prompt injection, credential leaks, and other threats.

## Install

```bash
npm install shieldcortex-sdk
```

## Quick Start

```typescript
import { ShieldCortex } from 'shieldcortex-sdk';

const sc = new ShieldCortex({ apiKey: 'sc_live_...' });

const result = await sc.scan({ content: 'user input here' });

if (!result.allowed) {
  console.log('Blocked:', result.firewall.reason);
}
```

## Getting an API Key

1. Sign up at [shieldcortex.ai](https://shieldcortex.ai)
2. Go to **Dashboard > Keys**
3. Click **Create Key** with the `scan` scope
4. Copy the key (it's only shown once)

## API

### `new ShieldCortex(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | *required* | Your API key (`sc_live_...` or `sc_test_...`) |
| `baseUrl` | `string` | `https://api.shieldcortex.ai` | API base URL |
| `timeout` | `number` | `30000` | Per-request timeout in milliseconds, covering the response body too. `0` or `Infinity` disables it. Negative, fractional, `NaN`, non-number or values above `2147483647` throw a `RangeError` at construction. A timed-out request rejects with `TimeoutError`. |

#### Per-call cancellation: `{ signal }`

`scan`, `scanBatch` and `scanSkill` accept an optional trailing `RequestOptions` argument, `{ signal?: AbortSignal }`. The signal and the client `timeout` both apply, and whichever fires first wins. When your signal aborts first, the call rejects with the signal's abort reason as-is, even during the response-body read and even when the reason is falsy, such as `null` (an `AbortError` `DOMException` if you gave no reason). It is never turned into a `TimeoutError`.

```typescript
const controller = new AbortController();
const result = await sc.scan({ content: 'user input here' }, { signal: controller.signal });
await sc.scanBatch(items, { config: { mode: 'strict' } }, { signal: AbortSignal.timeout(5000) });
```

### Scanning

#### `scan(input, { signal }?): Promise<ScanResult>`

Scan a single piece of content through the 6-layer defence pipeline.

```typescript
const result = await sc.scan({
  content: 'Text to scan',
  title: 'Optional title',
  source: { type: 'user', identifier: 'user-123' },
  config: { mode: 'strict' },
});

console.log(result.allowed);            // true or false
console.log(result.firewall.result);    // 'ALLOW' | 'BLOCK' | 'QUARANTINE'
console.log(result.trust.score);        // 0.0 - 1.0
console.log(result.sensitivity.level);  // 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED'
console.log(result.auditId);            // Unique audit trail ID
```

#### `scanBatch(items, options?, { signal }?): Promise<BatchResult>`

Scan up to 100 items in a single request.

```typescript
const result = await sc.scanBatch([
  { content: 'First input' },
  { content: 'Second input' },
], {
  source: { type: 'agent', identifier: 'my-bot' },
  config: { mode: 'balanced' },
});

console.log(result.totalScanned);  // 2
console.log(result.threats);       // Number of blocked/quarantined items
console.log(result.results);       // Individual ScanResult per item
```

### Audit Logs

#### `getAuditLogs(query?): Promise<AuditResponse>`

Query your team's audit trail with optional filters and pagination.

```typescript
const logs = await sc.getAuditLogs({
  level: 'BLOCK',       // Filter: 'ALLOW' | 'BLOCK' | 'QUARANTINE'
  from: '2026-01-01',   // ISO datetime
  limit: 50,
  offset: 0,
});

for (const log of logs.logs) {
  console.log(log.firewall_result, log.trust_score, log.reason);
}
```

#### `getAuditStats(timeRange?): Promise<AuditStats>`

Get summary statistics for your team.

```typescript
const stats = await sc.getAuditStats('7d');  // '24h' | '7d' | '30d'

console.log(stats.totalOperations);
console.log(stats.blockedCount);
console.log(stats.topSources);       // [{ source, count }]
console.log(stats.threatBreakdown);  // { indicator: count }
```

### Quarantine

#### `getQuarantine(query?): Promise<QuarantineResponse>`

List quarantined items pending review.

```typescript
const queue = await sc.getQuarantine({ status: 'pending', limit: 10 });

for (const item of queue.items) {
  console.log(item.reason, item.anomalyScore);
}
```

#### `reviewQuarantine(id, action): Promise<void>`

Approve or reject a quarantined item.

```typescript
await sc.reviewQuarantine(42, 'approve');
await sc.reviewQuarantine(43, 'reject');
```

## API Coverage

The client covers the full customer API surface documented in the lockstep
contract — 77 endpoints. The server also mounts additional dashboard- and
session-scoped `/v1` routes outside SDK scope. The table below is the
complete method inventory — every method is typed and follows the same
pattern (`get*`/`list*` for reads, `create*`/`update*`/`delete*` for writes):

| Group | Methods |
|-------|---------|
| Scanning | `scan`, `scanBatch`, `scanSkill` |
| Audit | `getAuditLogs`, `getAuditEntry`, `getAuditStats`, `getAuditTrends`, `ingestAuditEvents` |
| Audit export | `exportAuditLogs` (file download + integrity headers), `listAuditExports`, `getAuditExportManifest`, `verifyAuditExport`, `listAuditExportVerifications` |
| Iron Dome analytics | `getIronDomeStats`, `getIronDomeEvents` |
| Quarantine | `getQuarantine`, `reviewQuarantine` |
| API keys | `createApiKey`, `listApiKeys`, `revokeApiKey` |
| Teams and invites | `getTeam`, `updateTeam`, `getTeamMembers`, `getUsage`, `createInvite`, `listInvites`, `deleteInvite`, `resendInvite` |
| Devices | `getDevices`, `registerDevice`, `updateDevice`, `deviceHeartbeat` |
| Alerts and webhooks | `getAlerts`, `createAlert`, `updateAlert`, `deleteAlert`, `getWebhooks`, `createWebhook`, `updateWebhook`, `deleteWebhook`, `testWebhook`, `getWebhookDeliveries` |
| Firewall rules | `getFirewallRules`, `getActiveFirewallRules`, `createFirewallRule`, `updateFirewallRule`, `deleteFirewallRule` |
| Iron Dome patterns and policies | `getInjectionPatterns`, `getInjectionPatternsSync`, `createInjectionPattern`, `updateInjectionPattern`, `testInjectionPattern`, `deleteInjectionPattern`, `getIronDomePolicies`, `getIronDomePolicySync`, `createIronDomePolicy`, `updateIronDomePolicy`, `setDefaultIronDomePolicy`, `deleteIronDomePolicy` |
| Verification (Enterprise) | `submitVerification`, `listVerifications`, `getVerificationStats`, `getVerification`, `deleteVerification` |
| Skills | `ingestSkillScans`, `listSkillScans` |
| Threats / incidents / recall | `reportThreat` (compat shim), `replayIncidents`, `explainRecall` |
| Memory sync | `getSyncHealth`, `pushMemories`, `listSyncedMemories`, `pushMemoryGraph` |
| Licence | `getLicense`, `regenerateLicense` |
| Billing (deprecated) | `createCheckoutSession`, `createPortalSession` — self-serve plans were retired in July 2026 (Free + Enterprise model); these remain only for grandfathered licence holders |

### Deliberately deferred

The audit verification-export download sub-chain
(`GET /v1/audit/exports/{manifestId}/verifications/export` and the
`verification-exports` list/detail/download endpoints) is CLI tooling and is
deliberately not covered.

### Out of scope

- `platform/*` endpoints (internal)
- `auth/*` magic-link flows (dashboard sessions, not API keys)
- the retired ShieldCustomiser endpoints

### Cross-SDK policy notes

The TypeScript and Python SDKs stay in lockstep on the endpoint surface
(guarded by a shared parity manifest in `tests/endpoint-manifest.ts`), with
two deliberate differences:

1. Delete methods return `void` here; the Python SDK returns the typed
   response body where the server sends one. Per-language internal
   consistency was chosen over cross-SDK identity.
2. Both SDKs return `{ content, headers }` from the audit export download —
   the raw file body plus the parsed `X-ShieldCortex-Export-*` integrity
   headers. Absent `sha256`/`signature` headers surface as `undefined`,
   meaning the export cannot be verified.

## Error Handling

The SDK throws typed errors you can catch:

```typescript
import { ShieldCortex, AuthError, RateLimitError, ValidationError, TimeoutError } from 'shieldcortex-sdk';

try {
  await sc.scan({ content: 'test' });
} catch (err) {
  if (err instanceof AuthError) {
    // 401 - Invalid or expired API key
    console.error('Bad API key');
  } else if (err instanceof RateLimitError) {
    // 429 - Too many requests
    console.log('Retry after:', err.retryAfter, 'seconds');
  } else if (err instanceof ValidationError) {
    // 400 - Invalid request body
    console.error('Bad input:', err.body);
  } else if (err instanceof TimeoutError) {
    // Request did not complete within the client timeout (err.timeout ms); err.status is 0
    console.error('Timed out after', err.timeout, 'ms');
  }
}
```

All of these extend `ShieldCortexError`. The SDK does not wrap caller cancellation in `ShieldCortexError`: a caller-signal abort rejects with the signal's abort reason, so its type is whatever that reason is.

## Defence Modes

| Mode | Description |
|------|-------------|
| `strict` | Maximum security. Blocks on low-confidence threats. |
| `balanced` | Default. Good balance of security and usability. |
| `permissive` | Minimal blocking. Logs threats but rarely blocks. |

## Requirements

- Node.js 18+ (uses native `fetch`)
- TypeScript 5+ (for type definitions)

## Links

- [Website](https://shieldcortex.ai)
- [Documentation](https://shieldcortex.ai/docs)
- [npm package (core)](https://www.npmjs.com/package/shieldcortex)
- [GitHub](https://github.com/Drakon-Systems-Ltd/shieldcortex-sdk)

## Licence

MIT

## Release alignment

This SDK targets the ShieldCortex Cloud API. Coordinated with core **v4.52.0** / cloud **v2.18.0**. Client package version is independent of core. `0.3.0` was the coordinated cut; `0.3.1` was a client-side fix release with no API changes; `0.4.0` adds a client request timeout (default 30 s), per-call cancellation and `TimeoutError`, with no Cloud API changes.
