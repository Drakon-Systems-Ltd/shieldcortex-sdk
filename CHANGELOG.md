# Changelog

## 0.3.0 — source commit 2026-08-15

Version and metadata cut, coordinated with core v4.52.0 / cloud v2.18.0.
No source, API, type, lockfile, compiler or workflow changes since 0.2.0.

### Changed

- `package.json`: version `0.2.0` → `0.3.0`; repository URL normalised
  (`npm pkg fix`).
- README: new "Release alignment" section.

### Provenance (retrospective, verified 2026-10-06)

This note was added after the release. It is not part of the 0.3.0 source
commit or the published tarball.

- Source commit:
  [`8a7e72809ef61fc828b6f71c0d3b902aeb275244`](https://github.com/Drakon-Systems-Ltd/shieldcortex-sdk/commit/8a7e72809ef61fc828b6f71c0d3b902aeb275244)
  ([diff from v0.2.0](https://github.com/Drakon-Systems-Ltd/shieldcortex-sdk/compare/v0.2.0...8a7e72809ef61fc828b6f71c0d3b902aeb275244)).
- Registry artifact:
  [`shieldcortex-sdk-0.3.0.tgz`](https://registry.npmjs.org/shieldcortex-sdk/-/shieldcortex-sdk-0.3.0.tgz)
  ([npm](https://www.npmjs.com/package/shieldcortex-sdk/v/0.3.0)).
  - integrity: `sha512-DRBi2zzzZTNf5I6MqxsvFlKmYgkv0keDQAMC13YTlKhlpEyyQmhh+DKyRTMccqtsWaWYKIQAaXbo6b/YoNIbkw==`
  - sha256 of the compressed `.tgz`: `5a9fd1c6b261f0acab14fc286fc4a3e0053ad7f7623ef176b43bd3dc82e42b36`
- Reproduction: we ran `npm ci --ignore-scripts`, `npm run build` and
  `npm pack` at the commit above using the committed lockfile, with
  Node 22.23.3, npm 10.9.9 and TypeScript 5.9.3 on Linux. The resulting
  compressed tarball was byte-identical to the registry tarball. All nine
  packaged files matched (`package.json`, `README.md`, `LICENSE`, and
  `.js` + `.d.ts` for `errors`, `index` and `types`). `npm test` passed
  (100 tests). The CI toolchain (Node 20) was not used for this
  reproduction.
- 2026-08-15 is the source commit date and 2026-10-06 is the date the
  build was reproduced. We have not confirmed the registry publication
  date.
- There is no `v0.3.0` git tag; the only release tag is `v0.2.0`. We do not
  know who published 0.3.0 or how. This note is not an npm provenance
  attestation, and none is claimed for 0.3.0.

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
