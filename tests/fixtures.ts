import { vi } from 'vitest';
import { ShieldCortex } from '../src/index.js';
import type { ShieldCortexOptions } from '../src/index.js';

export const TEST_API_KEY = 'sc_test_abc123';

export interface CapturedCall {
  url: string;
  method: string;
  /** Header names normalised to lowercase by the Headers class. */
  headers: Record<string, string>;
  /** Raw request body string, undefined when no body was sent. */
  rawBody: string | undefined;
  /** JSON-parsed request body, undefined when no body was sent. */
  body: unknown;
}

export function makeClient(overrides: Partial<ShieldCortexOptions> = {}): ShieldCortex {
  return new ShieldCortex({ apiKey: TEST_API_KEY, ...overrides });
}

export function jsonResponse(status: number, json: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(json), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/**
 * Stub global fetch with a queue of canned responses. Each call to fetch
 * consumes the next response and records the request for assertions.
 */
export function mockFetch(...responses: Response[]): { calls: CapturedCall[]; fetchMock: ReturnType<typeof vi.fn> } {
  const calls: CapturedCall[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawBody = typeof init?.body === 'string' ? init.body : undefined;
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => {
      headers[key] = value;
    });
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers,
      rawBody,
      body: rawBody === undefined ? undefined : JSON.parse(rawBody),
    });
    const res = responses.shift();
    if (!res) throw new Error('mockFetch: no more queued responses');
    return res;
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

/** Convenience: queue a single JSON response. */
export function mockFetchOnce(
  status: number,
  json: unknown,
  headers: Record<string, string> = {}
): { calls: CapturedCall[]; fetchMock: ReturnType<typeof vi.fn> } {
  return mockFetch(jsonResponse(status, json, headers));
}
