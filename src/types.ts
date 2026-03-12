// --- Scan ---

export interface ScanInput {
  content: string;
  title?: string;
  source?: {
    type?: 'user' | 'cli' | 'hook' | 'email' | 'web' | 'agent' | 'file' | 'api';
    identifier?: string;
  };
  config?: {
    mode?: 'strict' | 'balanced' | 'permissive';
    enableFragmentationDetection?: boolean;
  };
}

export interface ScanResult {
  allowed: boolean;
  firewall: {
    result: 'ALLOW' | 'BLOCK' | 'QUARANTINE';
    reason: string;
    threatIndicators: string[];
    anomalyScore: number;
    blockedPatterns: string[];
  };
  sensitivity: {
    level: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
    redactionRequired: boolean;
  };
  trust: {
    score: number;
  };
  fragmentation?: {
    score: number;
    riskLevel?: string;
  };
  auditId: number;
  usage?: {
    scansUsed: number;
    scansLimit: number;
  };
}

// --- Batch ---

export interface BatchItem {
  content: string;
  title?: string;
}

export interface BatchOptions {
  source?: ScanInput['source'];
  config?: ScanInput['config'];
}

export interface BatchResult {
  totalScanned: number;
  threats: number;
  clean: number;
  results: ScanResult[];
}

// --- Skill Scan ---

export interface SkillScanInput {
  content: string;
  format?: string;
  name?: string;
  mode?: 'strict' | 'balanced' | 'permissive';
}

export interface SkillThreat {
  severity: string;
  pattern: string;
  description: string;
  line?: number;
  matchedText?: string;
}

export interface SkillScanResult {
  safe: boolean;
  skillName: string;
  format: string;
  findings: SkillThreat[];
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  scanDurationMs: number;
  firewall: {
    result: 'ALLOW' | 'BLOCK' | 'QUARANTINE';
    reason: string;
    threatIndicators: string[];
    anomalyScore: number;
    blockedPatterns: string[];
  };
  sensitivity: {
    level: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
    confidence: number;
    detectedPatterns: string[];
    redactionRequired: boolean;
  };
}

// --- Audit ---

export interface AuditQuery {
  from?: string;
  to?: string;
  level?: 'ALLOW' | 'BLOCK' | 'QUARANTINE';
  source?: string;
  device_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  source_type: string;
  source_identifier: string;
  trust_score: number;
  sensitivity_level: string;
  firewall_result: 'ALLOW' | 'BLOCK' | 'QUARANTINE';
  anomaly_score: number;
  threat_indicators: string[];
  reason: string;
  pipeline_duration_ms: number;
  device_id?: string;
  device_name?: string;
}

export interface AuditEntry {
  id: number;
  teamId: number;
  apiKeyId?: number | null;
  timestamp: string;
  sourceType: string;
  sourceIdentifier: string;
  trustScore?: number | null;
  sensitivityLevel?: string | null;
  firewallResult: 'ALLOW' | 'BLOCK' | 'QUARANTINE';
  anomalyScore?: number | null;
  threatIndicators?: string[] | null;
  blockedPatterns?: string[] | null;
  matchedRuleIds?: number[] | null;
  matchedRuleNames?: string[] | null;
  reason?: string | null;
  fragmentationScore?: number | null;
  pipelineDurationMs?: number | null;
  contentHash?: string | null;
  deviceId?: number | null;
}

export interface AuditResponse {
  logs: AuditLogEntry[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AuditStats {
  totalOperations: number;
  allowedCount: number;
  blockedCount: number;
  quarantinedCount: number;
  topSources: Array<{ source: string; count: number }>;
  threatBreakdown: Record<string, number>;
}

// --- Quarantine ---

export interface QuarantineQuery {
  status?: 'pending' | 'approved' | 'rejected' | 'expired';
  limit?: number;
  offset?: number;
}

export interface QuarantineItem {
  id: number;
  originalTitle: string | null;
  sourceType: string;
  sourceIdentifier: string;
  reason: string;
  threatIndicators: string[];
  anomalyScore: number;
  firewallResult: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
}

export interface QuarantineResponse {
  items: QuarantineItem[];
  total: number;
}

// --- API Keys ---

export interface CreateKeyInput {
  name: string;
  scopes?: string[];
  expiresIn?: number;
  isTest?: boolean;
}

export interface KeyInfo {
  id: number;
  name: string;
  scopes: string[];
  expiresAt?: string | null;
}

export interface CreateKeyResponse {
  message: string;
  key: string;
  keyInfo: KeyInfo;
  warning?: string;
}

export interface KeyListItem {
  id: number;
  name: string;
  prefix: string;
  scopes: string[];
  revoked: boolean;
  lastUsedAt?: string | null;
  createdAt?: string | null;
}

export interface KeyListResponse {
  keys: KeyListItem[];
  total: number;
}

// --- Teams ---

export interface TeamInfo {
  id: number;
  name: string;
  slug: string;
  plan: string;
  scanLimit: number;
}

export interface TeamMember {
  id: number;
  email: string;
  role: 'owner' | 'admin' | 'member';
  name?: string;
  joinedAt?: string;
}

export interface MembersResponse {
  members: TeamMember[];
  total: number;
}

export interface UsageResponse {
  used: number;
  limit: number;
  breakdown: {
    scans: number;
    batches: number;
    blocked: number;
    quarantined: number;
  };
}

// --- Invites ---

export interface Invite {
  id: number;
  email: string;
  role: 'admin' | 'member';
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy?: number;
}

export interface InviteListResponse {
  invites: Invite[];
  total: number;
}

// --- Billing ---

export interface CheckoutResponse {
  url: string;
}

export interface PortalResponse {
  url: string;
}

// --- Devices ---

export interface Device {
  id: string;
  name: string;
  platform: string;
  first_seen: string;
  last_seen: string;
  scan_count: number;
}

// --- Alerts ---

export interface AlertRule {
  id: number;
  name: string;
  enabled: boolean;
  trigger_on_block: boolean;
  trigger_on_quarantine: boolean;
  email_recipients: string[];
  created_at: string;
  trigger_on_anomaly_above?: number;
  last_triggered_at?: string;
}

export interface CreateAlertInput {
  name: string;
  email_recipients: string[];
  trigger_on_block?: boolean;
  trigger_on_quarantine?: boolean;
  trigger_on_anomaly_above?: number;
}

// --- Webhooks ---

export interface Webhook {
  id: number;
  name: string;
  url: string;
  enabled: boolean;
  events: string[];
  consecutive_failures: number;
  created_at: string;
  last_delivery_at?: string;
  last_delivery_status?: number;
  auto_disabled_at?: string;
}

export interface CreateWebhookResponse {
  id: number;
  name: string;
  url: string;
  secret: string;
  enabled: boolean;
  events: string[];
  created_at: string;
}

export interface TestWebhookResponse {
  success: boolean;
  status: number;
  duration_ms: number;
  message: string;
}

export interface WebhookDelivery {
  id: number;
  event: string;
  response_status: number;
  success: boolean;
  created_at: string;
  duration_ms: number;
}

// --- Firewall Rules ---

export interface FirewallRule {
  id: number;
  name: string;
  enabled: boolean;
  priority: number;
  rule_type: string;
  created_at: string;
  description?: string;
  config_overrides?: Record<string, unknown>;
  pattern_config?: Record<string, unknown>;
  source_config?: Record<string, unknown>;
  updated_at?: string;
}

// --- Iron Dome Patterns ---

export interface InjectionPattern {
  id: number;
  pattern: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  test_string: string;
  enabled: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: number;
}

export interface InjectionPatternsResponse {
  patterns: InjectionPattern[];
}

export interface PatternSyncResponse {
  patterns: Array<{ pattern: string; category: string; severity: string }>;
  updated_at: string | null;
}

export interface PatternTestResult {
  matched: boolean;
  match_count: number;
  matches: string[];
}

// --- Iron Dome Policies ---

export interface IronDomePolicy {
  id: number;
  name: string;
  base_profile: 'school' | 'enterprise' | 'personal' | 'paranoid';
  config_overrides: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: number;
}

export interface IronDomePoliciesResponse {
  policies: IronDomePolicy[];
}

export interface PolicySyncResponse {
  policy: {
    name: string;
    base_profile: string;
    config_overrides: Record<string, unknown>;
  } | null;
  updated_at: string | null;
}

// --- Client options ---

export interface ShieldCortexOptions {
  apiKey: string;
  baseUrl?: string;
}
