import type {
  ShieldCortexOptions,
  ScanInput,
  ScanResult,
  BatchItem,
  BatchOptions,
  BatchResult,
  AuditQuery,
  AuditResponse,
  AuditStats,
  QuarantineQuery,
  QuarantineResponse,
} from './types.js';
import { ShieldCortexError, AuthError, RateLimitError, ValidationError } from './errors.js';

const DEFAULT_BASE_URL = 'https://api.shieldcortex.ai';

export class ShieldCortex {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: ShieldCortexOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  // --- Core ---

  async scan(input: ScanInput): Promise<ScanResult> {
    return this.request<ScanResult>('/v1/scan', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async scanBatch(items: BatchItem[], options?: BatchOptions): Promise<BatchResult> {
    return this.request<BatchResult>('/v1/scan/batch', {
      method: 'POST',
      body: JSON.stringify({ items, ...options }),
    });
  }

  // --- Audit ---

  async getAuditLogs(query?: AuditQuery): Promise<AuditResponse> {
    const params = query ? '?' + new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return this.request<AuditResponse>(`/v1/audit${params}`);
  }

  async getAuditStats(timeRange?: '24h' | '7d' | '30d'): Promise<AuditStats> {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    return this.request<AuditStats>(`/v1/audit/stats${params}`);
  }

  // --- Quarantine ---

  async getQuarantine(query?: QuarantineQuery): Promise<QuarantineResponse> {
    const params = query ? '?' + new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    ).toString() : '';
    return this.request<QuarantineResponse>(`/v1/quarantine${params}`);
  }

  async reviewQuarantine(id: number, action: 'approve' | 'reject'): Promise<void> {
    await this.request(`/v1/quarantine/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  // --- Internal ---

  private async request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...init?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();

      if (res.status === 401) throw new AuthError(body);
      if (res.status === 429) {
        const retryAfter = res.headers.get('retry-after');
        throw new RateLimitError(body, retryAfter ? parseInt(retryAfter, 10) : null);
      }
      if (res.status === 400) throw new ValidationError(body);
      throw new ShieldCortexError(`API error: ${res.status}`, res.status, body);
    }

    return res.json() as Promise<T>;
  }
}

// Re-export types and errors
export type {
  ShieldCortexOptions,
  ScanInput,
  ScanResult,
  BatchItem,
  BatchOptions,
  BatchResult,
  AuditQuery,
  AuditEntry,
  AuditResponse,
  AuditStats,
  QuarantineQuery,
  QuarantineItem,
  QuarantineResponse,
} from './types.js';
export { ShieldCortexError, AuthError, RateLimitError, ValidationError } from './errors.js';
