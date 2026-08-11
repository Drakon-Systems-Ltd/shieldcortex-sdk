# Changelog

## 0.2.0 — 2026-08-11

Covers the full customer API surface documented in the lockstep contract
(77 endpoints), guarded by a cross-SDK parity manifest shared with the
Python SDK. Additional dashboard- and session-scoped `/v1` routes exist
server-side outside SDK scope.

### Added

- **Audit surface**: `getAuditTrends`, `exportAuditLogs` (file download with
  parsed `X-ShieldCortex-Export-*` integrity headers), `ingestAuditEvents`,
  `getIronDomeStats`, `getIronDomeEvents`, and the export-manifest chain
  (`listAuditExports`, `getAuditExportManifest`, `verifyAuditExport`,
  `listAuditExportVerifications`).
- **Verification (Enterprise)**: `submitVerification`, `listVerifications`,
  `getVerificationStats`, `getVerification`, `deleteVerification`.
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

- `AuditExportHeaders.sha256` / `.signature` are now `string | undefined` and
  `.count` is `number | undefined`: an absent header surfaces as `undefined`
  (previously `''` / `0`), meaning the export is unverifiable — treat it
  accordingly rather than comparing against an empty string.
- `VerificationSubmitResult.threats_detected` (like `verdict`, `confidence`,
  `action`, `duration_ms`) is optional — the server omits keys it leaves
  undefined; only cache hits default `threats_detected` to `[]`.
- `listAuditExportVerifications` takes the named, exported `PageQuery`
  interface instead of an inline `{ limit?, offset? }` type.
- All interfaces in `src/types.ts` are now re-exported via
  `export type * from './types.js'` — the exported type surface is a strict
  superset of 0.1.0. Exactly two names are new: `SkillScanInput` (previously
  defined but never re-exported) and `PageQuery`.

### Deprecated

- `createCheckoutSession` / `createPortalSession` — self-serve plans were
  retired in July 2026 (Free + Enterprise model); retained for grandfathered
  licence holders.

## 0.1.0

Initial release: `scan`, `scanBatch`, `scanSkill`, audit logs/stats,
quarantine, API keys, teams, invites, billing, devices, alerts, webhooks,
firewall rules, Iron Dome patterns and policies; typed error classes
(`ShieldCortexError`, `AuthError`, `ForbiddenError`, `NotFoundError`,
`RateLimitError`, `ValidationError`). Zero runtime dependencies, native
`fetch`, ESM-only.
