# Changelog

## [Unreleased]

## 0.4.1 — 2026-10-19

Client-side fix release. No Cloud API, type or dependency changes.

Merged pull requests: #16 (fix: convert HTTP-date Retry-After to seconds, closes #14).

### Fixed

- `RateLimitError.retryAfter` now converts an HTTP-date `Retry-After` to seconds (#14). A valid IMF-fixdate (`Sun, 06 Nov 1994 08:49:37 GMT`) gives the whole seconds from now until that time, rounded up and never negative; previously every date gave `null`. The date is checked strictly: exact case-sensitive format, real calendar date (month lengths, Gregorian leap years), hour 0-23, minute 0-59, second 0-60, and a weekday that matches the date. A leap second (`23:59:60`) counts as the start of the next UTC minute. Anything else, including the obsolete RFC 850 and asctime forms, still gives `null`. Delta-seconds are unchanged.

## 0.4.0 — 2026-10-17

Client feature release: a request timeout, per-call cancellation and a `TimeoutError` class, plus a `RateLimitError.retryAfter` fix and a docs-vs-code pass. No Cloud API or dependency changes. Minor rather than patch because the shipped change is typed `feat`. **Behaviour change:** requests now time out after 30 s by default (see Changed). `package.json` now declares `engines` `node >=20`, the version CI tests.

`0.3.1` was tagged but never published to npm (its publish run failed), so on npm this is the first release carrying the 0.3.1 path-parameter fixes as well: upgrading from npm `0.3.0` picks up both sections.

Merged pull requests: #11 (feat(client): request timeout, per-call AbortSignal and TimeoutError, closes #2) and #12 (docs: docs-vs-code pass at 0.3.0; Retry-After never NaN, for #4).

### Added

- `timeout` client option, in milliseconds, default `30000` to match the Python SDK. It covers the whole request, response body included. `0` or `Infinity` disables it. Invalid values (negative, fractional, `NaN`, non-number, above `2147483647`) throw a `RangeError` at construction.
- Per-call cancellation: `scan`, `scanBatch` and `scanSkill` accept an optional trailing `{ signal?: AbortSignal }` argument (exported type `RequestOptions`). A caller abort rejects with the signal's own abort reason as-is, including falsy reasons and during a response-body read; the SDK does not wrap it in `ShieldCortexError`.
- `TimeoutError` (extends `ShieldCortexError`), raised when a request does not complete within the client timeout. Its `status` is the SDK sentinel `0`; response headers may already have arrived. A `.timeout` property gives the timeout in milliseconds.

### Changed

- Requests now time out after 30 s by default and reject with `TimeoutError`. Before this change they waited indefinitely. Pass `timeout: 0` to keep the old behaviour.

### Fixed

- `RateLimitError.retryAfter` is no longer `NaN`. Delta-seconds give that integer; any other value, including an HTTP-date, gives `null` (HTTP-date `Retry-After` is not yet converted). Previously any value was passed through `parseInt`, so a date gave `NaN` and a value such as `30s` gave `30`.

### Documentation

- Node.js floor is now 20+, the version CI tests, and is declared in `package.json` `engines` (`>=20`). The README previously said 18+, which was neither declared nor tested.
- README states that the package is ESM-only: `require('shieldcortex-sdk')` is not supported, and CommonJS code can use dynamic `import()`. In `exports["."]` the `types` condition now comes before `import`.
- README documents every exported error class and the status it maps to: `ShieldCortexError`, `ValidationError` (400), `AuthError` (401), `ForbiddenError` (403), `NotFoundError` (404), `RateLimitError` (429) and `TimeoutError` (0).
- `CLAUDE.md` no longer keeps its own six-method list or partial error list; it points to the README method inventory and error table.

## 0.3.1 — 2026-10-17

Client-side fix release. No API, type or dependency changes. Tagged `v0.3.1` but not published to npm: the publish workflow failed at `npm publish`. These fixes first reach npm in 0.4.0.

Merged pull requests: #5 (fix(client): URL-encode path parameters, closes #3), #7 (fix(client): reject '.' and '..' path parameters before sending, closes #6) and #10 (fix(client): reject empty path parameters before sending, closes #8).

### Fixed

- Encode path parameters in API URLs so IDs containing slashes, question marks, or other special characters remain in one path segment.
- Reject empty, `.` and `..` path parameters before sending a request, so URL parsing cannot change the route.

## 0.3.0 — source commit 2026-08-15

Published to npm at 2026-08-15T04:39:01.445Z (registry `time` field, checked
2026-10-17). This confirms the publication date that the provenance note below
lists as unconfirmed.

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
