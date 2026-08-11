import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ShieldCortexError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from '../src/index.js';
import { jsonResponse, makeClient, mockFetch, mockFetchOnce } from './fixtures.js';

afterEach(() => {
  vi.unstubAllGlobals();
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
