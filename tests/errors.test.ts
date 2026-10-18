import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ShieldCortexError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from '../src/index.js';
import { parseRetryAfter } from '../src/retry-after.js';
import { jsonResponse, makeClient, mockFetch, mockFetchOnce } from './fixtures.js';

/** The reference time of the RFC 9110 examples: Sun, 06 Nov 1994 08:49:37 GMT. */
const REFERENCE_NOW = Date.UTC(1994, 10, 6, 8, 49, 37);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('error mapping', () => {
  it('maps 401 to AuthError and surfaces the raw body', async () => {
    mockFetchOnce(401, { error: 'Invalid API key' });

    const err = await makeClient().getTeam().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AuthError);
    expect(err).toBeInstanceOf(ShieldCortexError);
    const auth = err as AuthError;
    expect(auth.name).toBe('AuthError');
    expect(auth.status).toBe(401);
    expect(auth.message).toBe('Authentication failed — check your API key');
    expect(auth.body).toBe(JSON.stringify({ error: 'Invalid API key' }));
  });

  it('maps 403 to ForbiddenError', async () => {
    mockFetchOnce(403, { error: 'Pro plan required' });

    const err = await makeClient().getWebhooks().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ForbiddenError);
    const forbidden = err as ForbiddenError;
    expect(forbidden.status).toBe(403);
    expect(forbidden.message).toBe('Forbidden — insufficient permissions or plan');
    expect(forbidden.body).toContain('Pro plan required');
  });

  it('maps 404 to NotFoundError', async () => {
    mockFetchOnce(404, { error: 'No such entry' });

    const err = await makeClient().getAuditEntry(999).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    const notFound = err as NotFoundError;
    expect(notFound.status).toBe(404);
    expect(notFound.message).toBe('Resource not found');
    expect(notFound.body).toContain('No such entry');
  });

  it('maps 400 to ValidationError', async () => {
    mockFetchOnce(400, { error: 'content is required' });

    const err = await makeClient().scan({ content: '' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ValidationError);
    const validation = err as ValidationError;
    expect(validation.status).toBe(400);
    expect(validation.message).toBe('Validation error');
    expect(validation.body).toContain('content is required');
  });

  it('maps 429 to RateLimitError with retryAfter parsed from the Retry-After header', async () => {
    mockFetch(jsonResponse(429, { error: 'slow down' }, { 'retry-after': '30' }));

    const err = await makeClient().scan({ content: 'x' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(RateLimitError);
    const rateLimit = err as RateLimitError;
    expect(rateLimit.status).toBe(429);
    expect(rateLimit.message).toBe('Rate limit exceeded');
    expect(rateLimit.retryAfter).toBe(30);
  });

  it('sets retryAfter to null when Retry-After is absent', async () => {
    mockFetchOnce(429, { error: 'slow down' });

    const err = await makeClient().scan({ content: 'x' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter).toBeNull();
  });

  it.each([
    ['0', 0],
    ['120', 120],
  ])('sets retryAfter to the delta-seconds Retry-After %j', async (header, expected) => {
    mockFetch(jsonResponse(429, { error: 'slow down' }, { 'retry-after': header }));

    const err = await makeClient().scan({ content: 'x' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter).toBe(expected);
  });

  describe('HTTP-date Retry-After through the client', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it.each([
      ['Sun, 06 Nov 1994 08:51:07 GMT', 90],
      ['Sat, 31 Dec 1994 23:59:60 GMT', 4806623],
      ['Sun, 06 Nov 1994 08:49:36 GMT', 0],
      ['Foo, 06 Nov 1994 08:51:07 GMT', null],
      ['Mon, 06 Nov 1994 08:51:07 GMT', null],
    ])('sets retryAfter for %j to %j', async (header, expected) => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(REFERENCE_NOW);
      mockFetch(jsonResponse(429, { error: 'slow down' }, { 'retry-after': header }));

      const err = await makeClient().scan({ content: 'x' }).catch((e: unknown) => e);

      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfter).toBe(expected);
    });
  });

  it.each(['soon', '1.5', '-5', '30s', ''])('sets retryAfter to null for an unparseable Retry-After %j', async (header) => {
    mockFetch(jsonResponse(429, { error: 'slow down' }, { 'retry-after': header }));

    const err = await makeClient().scan({ content: 'x' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).retryAfter).toBeNull();
  });

  it('maps 422 to the generic ShieldCortexError, not ValidationError', async () => {
    mockFetchOnce(422, { error: 'unprocessable' });

    const err = await makeClient().scan({ content: 'x' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ShieldCortexError);
    expect(err).not.toBeInstanceOf(ValidationError);
    const generic = err as ShieldCortexError;
    expect(generic.status).toBe(422);
    expect(generic.message).toBe('API error: 422');
    expect(generic.body).toContain('unprocessable');
  });

  it('maps 5xx to the generic ShieldCortexError', async () => {
    mockFetchOnce(500, { error: 'boom' });

    const err = await makeClient().getUsage().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ShieldCortexError);
    const serverError = err as ShieldCortexError;
    expect(serverError.name).toBe('ShieldCortexError');
    expect(serverError.status).toBe(500);
    expect(serverError.message).toBe('API error: 500');
  });

  it('handles non-JSON error bodies by exposing the raw text', async () => {
    mockFetch(new Response('Bad Gateway', { status: 502, headers: { 'content-type': 'text/plain' } }));

    const err = await makeClient().getTeam().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ShieldCortexError);
    const gateway = err as ShieldCortexError;
    expect(gateway.status).toBe(502);
    expect(gateway.body).toBe('Bad Gateway');
  });

  it('throws on error statuses for void methods too', async () => {
    mockFetchOnce(404, { error: 'no such key' });

    const err = await makeClient().revokeApiKey(999).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
  });
});

describe('parseRetryAfter', () => {
  it.each([
    // Required results from issue #14, relative to Sun, 06 Nov 1994 08:49:37 GMT.
    ['Foo, 06 Nov 1994 08:51:07 GMT', null], // unknown weekday
    ['Sun, 31 Nov 1994 08:51:07 GMT', null], // impossible date
    ['Sun, 06 Nov 1994 24:00:00 GMT', null], // hour 24
    ['Sat, 31 Dec 1994 23:59:60 GMT', 4806623], // leap second: the following UTC minute boundary
    ['Mon, 06 Nov 1994 08:51:07 GMT', null], // weekday does not match the date
    ['Wed, 29 Feb 1995 00:00:00 GMT', null], // 29 February in a non-leap year
    // Valid dates.
    ['Sun, 06 Nov 1994 08:51:07 GMT', 90],
    ['Sun, 06 Nov 1994 08:49:37 GMT', 0],
    ['Sun, 06 Nov 1994 08:49:36 GMT', 0], // past: never negative
    ['Fri, 01 Jan 2100 00:00:00 GMT', 3318333023],
    ['Mon, 01 Jan 0001 00:00:00 GMT', 0], // year 1 is not read as 1901 (a Tuesday)
    ['Tue, 01 Jan 0001 00:00:00 GMT', null],
    // Other range checks.
    ['Sun, 00 Nov 1994 08:51:07 GMT', null],
    ['Sun, 06 Nov 1994 08:60:00 GMT', null],
    ['Sun, 06 Nov 1994 08:49:61 GMT', null],
    // Not IMF-fixdate: case, spacing, zone and the obsolete RFC 850 and asctime forms.
    ['sun, 06 Nov 1994 08:51:07 GMT', null],
    ['Sun, 06 nov 1994 08:51:07 GMT', null],
    ['Sun, 06 Nov 1994 08:51:07 gmt', null],
    ['Sun, 06 Nov 1994 08:51:07 UTC', null],
    ['Sun,  06 Nov 1994 08:51:07 GMT', null],
    ['Sun, 6 Nov 1994 08:51:07 GMT', null],
    [' Sun, 06 Nov 1994 08:51:07 GMT', null],
    ['Sunday, 06-Nov-94 08:51:07 GMT', null],
    ['Sun Nov  6 08:51:07 1994', null],
  ])('converts %j to %j', (value, expected) => {
    expect(parseRetryAfter(value, REFERENCE_NOW)).toBe(expected);
  });

  it('accepts 29 February in a leap year, including a century divisible by 400', () => {
    const now = Date.UTC(2000, 1, 28);
    expect(parseRetryAfter('Tue, 29 Feb 2000 00:00:00 GMT', now)).toBe(86400);
    expect(parseRetryAfter('Thu, 29 Feb 1900 00:00:00 GMT', now)).toBeNull();
  });

  it('rounds a partial second up', () => {
    expect(parseRetryAfter('Sun, 06 Nov 1994 08:49:38 GMT', REFERENCE_NOW + 1)).toBe(1);
    expect(parseRetryAfter('Sun, 06 Nov 1994 08:49:38 GMT', REFERENCE_NOW + 999)).toBe(1);
  });

  it('keeps delta-seconds as-is and does not depend on now', () => {
    expect(parseRetryAfter('120', REFERENCE_NOW)).toBe(120);
    expect(parseRetryAfter('0')).toBe(0);
    expect(parseRetryAfter(null)).toBeNull();
  });

  it('measures from Date.now() by default', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(REFERENCE_NOW);
      expect(parseRetryAfter('Sun, 06 Nov 1994 08:51:07 GMT')).toBe(90);
    } finally {
      vi.useRealTimers();
    }
  });
});
