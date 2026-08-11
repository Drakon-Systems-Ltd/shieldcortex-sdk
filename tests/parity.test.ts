import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { COVERED, DEFERRED } from './endpoint-manifest.js';

/**
 * Drift tripwire, NOT a correctness proof. It asserts every manifest path
 * template appears in the client source (so the manifest can't silently rot),
 * but it does not prove the method attached to each path, nor that the client
 * has no endpoints missing from the manifest. Review both files together
 * whenever the API surface changes.
 */

const source = readFileSync(
  fileURLToPath(new URL('../src/index.ts', import.meta.url)),
  'utf8'
);

// Normalise template-literal params (`${manifestId}` → `{manifestId}`) so the
// source can be matched against the manifest's placeholder form.
const normalised = source.replace(/\$\{(\w+)\}/g, '{$1}');

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Anchored on the closing delimiter so a path that merely prefixes another
// (e.g. /v1/audit inside /v1/audit/stats) cannot satisfy the check. In the
// client source a path template ends at a quote, a backtick, or a `$` (the
// `${this.buildQuery(...)}` interpolation, which normalisation leaves alone).
const appearsInSource = (path: string) =>
  new RegExp(`${escapeRegExp(path)}["'\`$?]`).test(normalised);

describe('cross-SDK endpoint parity manifest', () => {
  it('every COVERED path template appears in src/index.ts', () => {
    const missing = COVERED.filter(([, path]) => !appearsInSource(path));
    expect(missing).toEqual([]);
  });

  it('COVERED has no duplicate [method, path] entries', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const [method, path] of COVERED) {
      const key = `${method} ${path}`;
      if (seen.has(key)) dupes.push(key);
      seen.add(key);
    }
    expect(dupes).toEqual([]);
  });

  it('no COVERED entry is also listed as DEFERRED', () => {
    const deferred = new Set(DEFERRED.map(([m, p]) => `${m} ${p}`));
    const overlap = COVERED.filter(([m, p]) => deferred.has(`${m} ${p}`));
    expect(overlap).toEqual([]);
  });
});
