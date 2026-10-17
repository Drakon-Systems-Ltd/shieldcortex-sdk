import { createServer, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShieldCortexError, TimeoutError } from '../src/index.js';
import type { RequestOptions } from '../src/index.js';
import { makeClient, mockFetchOnce } from './fixtures.js';

type Handler = (res: ServerResponse) => void;

/** Local HTTP server whose behaviour per request is set by each test. */
let server: Server;
let baseUrl: string;
let handler: Handler;
const open = new Set<ServerResponse>();

beforeEach(async () => {
  handler = () => {}; // accept and never respond
  server = createServer((_req, res) => {
    open.add(res);
    res.on('close', () => open.delete(res));
    handler(res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  vi.unstubAllGlobals();
  for (const res of open) res.destroy();
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('request timeout', () => {
  it('rejects a hung request with TimeoutError within the timeout', async () => {
    const client = makeClient({ baseUrl, timeout: 50 });
    const started = Date.now();

    const err = await client.scan({ content: 'hello' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(TimeoutError);
    expect(err).toBeInstanceOf(ShieldCortexError);
    const timeout = err as TimeoutError;
    expect(timeout.name).toBe('TimeoutError');
    expect(timeout.timeout).toBe(50);
    expect(timeout.status).toBe(0);
    expect(timeout.message).toBe('Request timed out after 50 ms');
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('times out a response whose body stalls after the headers', async () => {
    handler = (res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.write('{"allowed":');
    };
    const client = makeClient({ baseUrl, timeout: 50 });

    await expect(client.getTeam()).rejects.toBeInstanceOf(TimeoutError);
  });

  it('applies to every method, not only the ones that accept a signal', async () => {
    const client = makeClient({ baseUrl, timeout: 50 });

    await expect(client.exportAuditLogs()).rejects.toBeInstanceOf(TimeoutError);
  });

  it('defaults to 30 000 ms', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    mockFetchOnce(200, { allowed: true });

    await makeClient().scan({ content: 'hello' });

    expect(timeoutSpy).toHaveBeenCalledWith(30_000);
    timeoutSpy.mockRestore();
  });

  it.each([0, Infinity])('timeout: %s disables the timeout', async (timeout) => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    const { fetchMock } = mockFetchOnce(200, { allowed: true });

    await makeClient({ timeout }).scan({ content: 'hello' });

    expect(timeoutSpy).not.toHaveBeenCalled();
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBeUndefined();
    timeoutSpy.mockRestore();
  });

  it('a fast response still succeeds with a timeout set', async () => {
    handler = (res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ allowed: true }));
    };
    const client = makeClient({ baseUrl, timeout: 1000 });

    await expect(client.scan({ content: 'hello' })).resolves.toEqual({ allowed: true });
  });

  it('keeps HTTP error mapping unchanged when a timeout is set', async () => {
    handler = (res) => {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end('{"error":"boom"}');
    };
    const client = makeClient({ baseUrl, timeout: 1000 });

    const err = await client.getTeam().catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ShieldCortexError);
    expect(err).not.toBeInstanceOf(TimeoutError);
    expect((err as ShieldCortexError).status).toBe(500);
  });

  it('leaves no ref\'d timer behind after a successful request', async () => {
    // getActiveResourcesInfo() lists only timers that keep the event loop alive.
    const refTimers = () => process.getActiveResourcesInfo().filter((r) => r === 'Timeout').length;
    mockFetchOnce(200, { allowed: true });
    const before = refTimers();

    await makeClient().scan({ content: 'hello' });

    expect(refTimers()).toBe(before);
  });

  it.each([-1, NaN, 2_147_483_648, -Infinity, '100'])('rejects timeout: %s at construction', (timeout) => {
    expect(() => makeClient({ timeout: timeout as number })).toThrow(RangeError);
  });

  it('accepts the largest timer delay', () => {
    expect(() => makeClient({ timeout: 2_147_483_647 })).not.toThrow();
  });
});

describe('per-call signal', () => {
  it('a caller abort rejects with the abort reason, not TimeoutError', async () => {
    const client = makeClient({ baseUrl, timeout: 5000 });
    const controller = new AbortController();
    const reason = new Error('caller gave up');

    const pending = client.scan({ content: 'hello' }, { signal: controller.signal }).catch((e: unknown) => e);
    setTimeout(() => controller.abort(reason), 20);

    expect(await pending).toBe(reason);
  });

  it('a caller abort without a reason rejects with the AbortError', async () => {
    const client = makeClient({ baseUrl, timeout: 5000 });
    const controller = new AbortController();

    const pending = client.scanBatch([{ content: 'a' }], undefined, { signal: controller.signal }).catch((e: unknown) => e);
    setTimeout(() => controller.abort(), 20);

    const err = await pending;
    expect(err).not.toBeInstanceOf(TimeoutError);
    expect((err as DOMException).name).toBe('AbortError');
    expect(err).toBe(controller.signal.reason);
  });

  it('works with the timeout disabled', async () => {
    const client = makeClient({ baseUrl, timeout: 0 });
    const reason = new Error('stop');

    await expect(
      client.scanSkill('# skill', undefined, { signal: AbortSignal.abort(reason) })
    ).rejects.toBe(reason);
  });

  it('the timeout still applies when the caller signal never fires', async () => {
    const client = makeClient({ baseUrl, timeout: 50 });
    const options: RequestOptions = { signal: new AbortController().signal };

    await expect(client.scan({ content: 'hello' }, options)).rejects.toBeInstanceOf(TimeoutError);
  });
});
