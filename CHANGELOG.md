# Changelog

## 0.2.0 — 2026-08-11

Covers the full customer API surface documented in the lockstep contract
(77 endpoints), guarded by a cross-SDK parity manifest shared with the
Python SDK. Additional dashboard- and session-scoped `/v1` routes exist
server-side outside SDK scope.

### Added

- **Audit surface**: `getAuditTrends`, `exportAuditLogs`, `ingestAuditEvents`,
  `getIronDomeStats`, `getIronDomeEvents`, and the export-manifest chain
  (`listAuditExports`, `getAuditExportManifest`, `verifyAuditExport`,
  `listAuditExportVerifications` — the latter takes the exported `PageQuery`
  interface). `exportAuditLogs` returns the raw file body plus the parsed
  `X-ShieldCortex-Export-*` integrity headers; absent `sha256`/`signature`/
  `manifestId` headers surface as `undefined` (never `''`), meaning the
  export is unverifiable — treat it accordingly.
- **Verification (Enterprise)**: `submitVerification`, `listVerifications`,
  `getVerificationStats`, `getVerification`, `deleteVerification`. On
  `VerificationSubmitResult`, `threats_detected` (like `verdict`,
  `confidence`, `action`, `duration_ms`) is optional — the server omits keys
  it leaves undefined; only cache hits default `threats_detected` to `[]`.
- **Skills**: `ingestSkillScans`, `listSkillScans`.
- **Threats**: `reportThreat` (OpenClaw realtime compat shim, max 100 events
  per call).
- **Incidents / recall**: `replayIncidents`, `explainRecall`.
- **Memory sync**: `getSyncHealth`, `pushMemories`, `listSyncedMemories`,
  `pushMemoryGraph`.
- **Licence**: `getLicense`, `regenerateLicense`.
- Cross-SDK endpoint parity manifest and drift-guard test
  (`tests/endpoint-manifest.ts`, `tests/parity.test.ts`).
- CI workflows: build + test on push/PR, npm publish on `v*` tags.

### Changed

- All interfaces in `src/types.ts` are now re-exported via
  `export type * from './types.js'`. Every type exported by 0.1.0 is still
  exported — the type surface is a strict superset.

### Deprecated

- `createCheckoutSession` / `createPortalSession` — self-serve plans were
  retired in July 2026 (Free + Enterprise model); retained for grandfathered
  licence holders.

## 0.1.0 — 2026-03-12

Initial release: `scan`, `scanBatch`, `scanSkill`, audit logs/stats,
quarantine, API keys, teams, invites, billing, devices, alerts, webhooks,
firewall rules, Iron Dome patterns and policies; typed error classes
(`ShieldCortexError`, `AuthError`, `ForbiddenError`, `NotFoundError`,
`RateLimitError`, `ValidationError`). Zero runtime dependencies, native
`fetch`, ESM-only.
