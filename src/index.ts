import type {
  ShieldCortexOptions,
  ScanInput,
  ScanResult,
  BatchItem,
  BatchOptions,
  BatchResult,
  SkillScanResult,
  AuditQuery,
  AuditEntry,
  AuditLogEntry,
  AuditResponse,
  AuditStats,
  QuarantineQuery,
  QuarantineResponse,
  CreateKeyInput,
  CreateKeyResponse,
  KeyListResponse,
  TeamInfo,
  MembersResponse,
  UsageResponse,
  Invite,
  InviteListResponse,
  CheckoutResponse,
  PortalResponse,
  Device,
  AlertRule,
  CreateAlertInput,
  Webhook,
  CreateWebhookResponse,
  TestWebhookResponse,
  WebhookDelivery,
  FirewallRule,
  InjectionPattern,
  InjectionPatternsResponse,
  PatternSyncResponse,
  PatternTestResult,
  IronDomePolicy,
  IronDomePoliciesResponse,
  PolicySyncResponse,
} from './types.js';
import { ShieldCortexError, AuthError, RateLimitError, ValidationError, ForbiddenError, NotFoundError } from './errors.js';

const DEFAULT_BASE_URL = 'https://api.shieldcortex.ai';

export class ShieldCortex {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: ShieldCortexOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  // --- Scanning ---

  async scan(input: ScanInput): Promise<ScanResult> {
    return this.post<ScanResult>('/v1/scan', input);
  }

  async scanBatch(items: BatchItem[], options?: BatchOptions): Promise<BatchResult> {
    return this.post<BatchResult>('/v1/scan/batch', { items, ...options });
  }

  async scanSkill(content: string, options?: { format?: string; name?: string; mode?: string }): Promise<SkillScanResult> {
    return this.post<SkillScanResult>('/v1/scan/skill', { content, format: 'skill-md', ...options });
  }

  // --- Audit ---

  async getAuditLogs(query?: AuditQuery): Promise<AuditResponse> {
    return this.get<AuditResponse>('/v1/audit', query);
  }

  async getAuditEntry(id: number): Promise<AuditEntry> {
    return this.get<AuditEntry>(`/v1/audit/${id}`);
  }

  async getAuditStats(timeRange?: '24h' | '7d' | '30d'): Promise<AuditStats> {
    return this.get<AuditStats>('/v1/audit/stats', timeRange ? { timeRange } : undefined);
  }

  // --- Quarantine ---

  async getQuarantine(query?: QuarantineQuery): Promise<QuarantineResponse> {
    return this.get<QuarantineResponse>('/v1/quarantine', query);
  }

  async reviewQuarantine(id: number, action: 'approve' | 'reject'): Promise<void> {
    await this.post(`/v1/quarantine/${id}/review`, { action });
  }

  // --- API Keys ---

  async createApiKey(input: CreateKeyInput): Promise<CreateKeyResponse> {
    return this.post<CreateKeyResponse>('/v1/keys', input);
  }

  async listApiKeys(): Promise<KeyListResponse> {
    return this.get<KeyListResponse>('/v1/keys');
  }

  async revokeApiKey(id: number): Promise<void> {
    await this.del(`/v1/keys/${id}`);
  }

  // --- Teams ---

  async getTeam(): Promise<TeamInfo> {
    return this.get<TeamInfo>('/v1/teams');
  }

  async updateTeam(name: string): Promise<void> {
    await this.patch('/v1/teams', { name });
  }

  async getTeamMembers(): Promise<MembersResponse> {
    return this.get<MembersResponse>('/v1/teams/members');
  }

  async getUsage(): Promise<UsageResponse> {
    return this.get<UsageResponse>('/v1/teams/usage');
  }

  // --- Invites ---

  async createInvite(email: string, role: 'admin' | 'member' = 'member'): Promise<Invite> {
    const data = await this.post<{ invite: Invite }>('/v1/invites', { email, role });
    return data.invite ?? data as unknown as Invite;
  }

  async listInvites(): Promise<InviteListResponse> {
    return this.get<InviteListResponse>('/v1/invites');
  }

  async deleteInvite(id: number): Promise<void> {
    await this.del(`/v1/invites/${id}`);
  }

  async resendInvite(id: number): Promise<void> {
    await this.post(`/v1/invites/${id}/resend`, {});
  }

  // --- Billing ---

  async createCheckoutSession(): Promise<CheckoutResponse> {
    return this.post<CheckoutResponse>('/v1/billing/checkout', {});
  }

  async createPortalSession(): Promise<PortalResponse> {
    return this.post<PortalResponse>('/v1/billing/portal', {});
  }

  // --- Devices ---

  async getDevices(): Promise<Device[]> {
    const data = await this.get<{ devices: Device[] }>('/v1/devices');
    return data.devices ?? data as unknown as Device[];
  }

  async registerDevice(deviceId: string, options?: { deviceName?: string; platform?: string }): Promise<void> {
    await this.post('/v1/devices', {
      device_id: deviceId,
      device_name: options?.deviceName,
      platform: options?.platform,
    });
  }

  async updateDevice(uuid: string, name: string): Promise<void> {
    await this.patch(`/v1/devices/${uuid}`, { name });
  }

  async deviceHeartbeat(deviceId: string, options?: { deviceName?: string; platform?: string }): Promise<void> {
    await this.post('/v1/devices/heartbeat', {
      device_id: deviceId,
      device_name: options?.deviceName,
      platform: options?.platform,
    });
  }

  // --- Alerts ---

  async getAlerts(): Promise<AlertRule[]> {
    const data = await this.get<{ rules: AlertRule[] }>('/v1/alerts');
    return data.rules;
  }

  async createAlert(input: CreateAlertInput): Promise<AlertRule> {
    return this.post<AlertRule>('/v1/alerts', input);
  }

  async updateAlert(id: number, updates: Partial<CreateAlertInput & { enabled: boolean }>): Promise<AlertRule> {
    return this.patch<AlertRule>(`/v1/alerts/${id}`, updates);
  }

  async deleteAlert(id: number): Promise<void> {
    await this.del(`/v1/alerts/${id}`);
  }

  // --- Webhooks ---

  async getWebhooks(): Promise<Webhook[]> {
    const data = await this.get<{ webhooks: Webhook[] }>('/v1/webhooks');
    return data.webhooks;
  }

  async createWebhook(name: string, url: string, events: string[]): Promise<CreateWebhookResponse> {
    return this.post<CreateWebhookResponse>('/v1/webhooks', { name, url, events });
  }

  async updateWebhook(id: number, updates: Partial<{ name: string; url: string; events: string[]; enabled: boolean }>): Promise<Webhook> {
    return this.patch<Webhook>(`/v1/webhooks/${id}`, updates);
  }

  async deleteWebhook(id: number): Promise<void> {
    await this.del(`/v1/webhooks/${id}`);
  }

  async testWebhook(id: number): Promise<TestWebhookResponse> {
    return this.post<TestWebhookResponse>(`/v1/webhooks/${id}/test`, {});
  }

  async getWebhookDeliveries(id: number): Promise<WebhookDelivery[]> {
    const data = await this.get<{ deliveries: WebhookDelivery[] }>(`/v1/webhooks/${id}/deliveries`);
    return data.deliveries;
  }

  // --- Firewall Rules ---

  async getFirewallRules(): Promise<FirewallRule[]> {
    const data = await this.get<{ rules: FirewallRule[] }>('/v1/firewall-rules');
    return data.rules;
  }

  async getActiveFirewallRules(): Promise<FirewallRule[]> {
    const data = await this.get<{ rules: FirewallRule[] }>('/v1/firewall-rules/active');
    return data.rules;
  }

  async createFirewallRule(input: Record<string, unknown>): Promise<FirewallRule> {
    return this.post<FirewallRule>('/v1/firewall-rules', input);
  }

  async updateFirewallRule(id: number, updates: Record<string, unknown>): Promise<FirewallRule> {
    return this.patch<FirewallRule>(`/v1/firewall-rules/${id}`, updates);
  }

  async deleteFirewallRule(id: number): Promise<void> {
    await this.del(`/v1/firewall-rules/${id}`);
  }

  // --- Iron Dome Patterns (Pro+) ---

  async getInjectionPatterns(): Promise<InjectionPatternsResponse> {
    return this.get<InjectionPatternsResponse>('/v1/iron-dome/patterns');
  }

  async getInjectionPatternsSync(): Promise<PatternSyncResponse> {
    return this.get<PatternSyncResponse>('/v1/iron-dome/patterns/sync');
  }

  async createInjectionPattern(input: {
    pattern: string;
    category: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    test_string: string;
  }): Promise<InjectionPattern> {
    return this.post<InjectionPattern>('/v1/iron-dome/patterns', input);
  }

  async updateInjectionPattern(id: number, updates: Partial<{
    pattern: string;
    category: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    test_string: string;
    enabled: boolean;
  }>): Promise<InjectionPattern> {
    return this.patch<InjectionPattern>(`/v1/iron-dome/patterns/${id}`, updates);
  }

  async testInjectionPattern(id: number, text: string): Promise<PatternTestResult> {
    return this.post<PatternTestResult>(`/v1/iron-dome/patterns/${id}/test`, { text });
  }

  async deleteInjectionPattern(id: number): Promise<void> {
    await this.del(`/v1/iron-dome/patterns/${id}`);
  }

  // --- Iron Dome Policies (Pro+) ---

  async getIronDomePolicies(): Promise<IronDomePoliciesResponse> {
    return this.get<IronDomePoliciesResponse>('/v1/iron-dome/policies');
  }

  async getIronDomePolicySync(): Promise<PolicySyncResponse> {
    return this.get<PolicySyncResponse>('/v1/iron-dome/policies/sync');
  }

  async createIronDomePolicy(input: {
    name: string;
    base_profile: 'school' | 'enterprise' | 'personal' | 'paranoid';
    config_overrides?: Record<string, unknown>;
    is_default?: boolean;
  }): Promise<IronDomePolicy> {
    return this.post<IronDomePolicy>('/v1/iron-dome/policies', input);
  }

  async updateIronDomePolicy(id: number, updates: Partial<{
    name: string;
    base_profile: 'school' | 'enterprise' | 'personal' | 'paranoid';
    config_overrides: Record<string, unknown>;
  }>): Promise<IronDomePolicy> {
    return this.patch<IronDomePolicy>(`/v1/iron-dome/policies/${id}`, updates);
  }

  async setDefaultIronDomePolicy(id: number): Promise<IronDomePolicy> {
    return this.put<IronDomePolicy>(`/v1/iron-dome/policies/${id}/default`);
  }

  async deleteIronDomePolicy(id: number): Promise<void> {
    await this.del(`/v1/iron-dome/policies/${id}`);
  }

  // --- Internal HTTP ---

  private async get<T = unknown>(path: string, params?: Record<string, unknown> | object): Promise<T> {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return this.request<T>(`${path}${qs}`);
  }

  private async post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  private async patch<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  private async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
  }

  private async del(path: string): Promise<void> {
    await this.request(path, { method: 'DELETE' });
  }

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
      if (res.status === 403) throw new ForbiddenError(body);
      if (res.status === 404) throw new NotFoundError(body);
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
  SkillScanResult,
  SkillThreat,
  AuditQuery,
  AuditEntry,
  AuditLogEntry,
  AuditResponse,
  AuditStats,
  QuarantineQuery,
  QuarantineItem,
  QuarantineResponse,
  CreateKeyInput,
  KeyInfo,
  CreateKeyResponse,
  KeyListItem,
  KeyListResponse,
  TeamInfo,
  TeamMember,
  MembersResponse,
  UsageResponse,
  Invite,
  InviteListResponse,
  CheckoutResponse,
  PortalResponse,
  Device,
  AlertRule,
  CreateAlertInput,
  Webhook,
  CreateWebhookResponse,
  TestWebhookResponse,
  WebhookDelivery,
  FirewallRule,
  InjectionPattern,
  InjectionPatternsResponse,
  PatternSyncResponse,
  PatternTestResult,
  IronDomePolicy,
  IronDomePoliciesResponse,
  PolicySyncResponse,
} from './types.js';
export { ShieldCortexError, AuthError, RateLimitError, ValidationError, ForbiddenError, NotFoundError } from './errors.js';
