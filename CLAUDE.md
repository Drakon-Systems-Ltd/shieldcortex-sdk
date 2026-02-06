# @shieldcortex/sdk

TypeScript SDK for the ShieldCortex API — AI memory security scanning.

## What This Package Does

This is a lightweight HTTP client that wraps the ShieldCortex SaaS API. It lets developers scan AI agent inputs/memory for prompt injection, credential leaks, encoding attacks, and other threats.

## Installation

```bash
npm install @shieldcortex/sdk
```

## Quick Integration

```typescript
import { ShieldCortex } from '@shieldcortex/sdk';

const sc = new ShieldCortex({ apiKey: process.env.SHIELDCORTEX_API_KEY! });

// Scan user input before processing
const result = await sc.scan({ content: userInput });
if (!result.allowed) {
  throw new Error(`Input blocked: ${result.firewall.reason}`);
}
```

## Available Methods

| Method | Purpose |
|--------|---------|
| `scan(input)` | Scan single content through 5-layer defence pipeline |
| `scanBatch(items, opts?)` | Scan up to 100 items in one request |
| `getAuditLogs(query?)` | Query audit trail with filters and pagination |
| `getAuditStats(timeRange?)` | Get summary stats (`'24h'`, `'7d'`, `'30d'`) |
| `getQuarantine(query?)` | List quarantined items |
| `reviewQuarantine(id, action)` | Approve or reject quarantined item |

## Key Types

```typescript
// Constructor
new ShieldCortex({ apiKey: string, baseUrl?: string })

// Scan input
{ content: string, title?: string, source?: { type, identifier }, config?: { mode } }

// Scan result
{ allowed: boolean, firewall: { result, reason, anomalyScore }, trust: { score }, auditId: number }

// Defence modes: 'strict' | 'balanced' | 'permissive'
// Firewall results: 'ALLOW' | 'BLOCK' | 'QUARANTINE'
```

## Error Classes

- `AuthError` (401) — Invalid API key
- `RateLimitError` (429) — Has `.retryAfter` property (seconds)
- `ValidationError` (400) — Bad request body
- `ShieldCortexError` — Base class, has `.status` and `.body`

## Common Patterns

### Middleware guard (Express/Hono)

```typescript
async function shieldGuard(req, res, next) {
  const result = await sc.scan({ content: req.body.message });
  if (!result.allowed) {
    return res.status(403).json({ error: result.firewall.reason });
  }
  next();
}
```

### LangChain tool wrapper

```typescript
async function safeTool(input: string) {
  const check = await sc.scan({ content: input, source: { type: 'agent' } });
  if (!check.allowed) throw new Error('Blocked by ShieldCortex');
  return actualTool(input);
}
```

### Batch processing

```typescript
const results = await sc.scanBatch(
  messages.map(m => ({ content: m.text })),
  { config: { mode: 'strict' } }
);
const threats = results.results.filter(r => !r.allowed);
```

## Project Structure

```
sdk/
  src/
    index.ts    — ShieldCortex client class
    types.ts    — All TypeScript interfaces
    errors.ts   — Error classes (AuthError, RateLimitError, etc.)
  dist/         — Compiled output
```

## Development

```bash
npm run build    # Compile TypeScript
```

Zero runtime dependencies. Uses native `fetch` (Node 18+). ESM-only.
