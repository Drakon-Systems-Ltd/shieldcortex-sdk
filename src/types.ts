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

/** Shared limit/offset page query for list endpoints. */
export interface PageQuery {
  limit?: number;
  offset?: number;
}

/** Shared list-envelope pagination. `hasMore` is camelCase on the wire. */
export interface Pagination {
  limit: number;
  offset: number;
  hasMore: boolean;
}

// --- Audit Trends ---

export interface AuditTrendsQuery {
  /** camelCase on the wire — preserved verbatim. */
  timeRange?: '24h' | '7d' | '30d';
  device_id?: string;
  source?: string;
}

export interface AuditTrendBucket {
  time: string;
  allowed: number;
  blocked: number;
  quarantined: number;
}

export interface AuditTrendsResponse {
  buckets: AuditTrendBucket[];
  /** The EFFECTIVE range — free tier requesting 30d gets back "7d". */
  timeRange: '24h' | '7d' | '30d';
}

// --- Audit Export (file download) ---

export interface AuditExportQuery {
  /** Defaults to "json" when omitted. */
  format?: 'csv' | 'json';
  /** Only affects format=json; default "array". */
  shape?: 'array' | 'envelope';
  from?: string;
  to?: string;
  level?: 'ALLOW' | 'BLOCK' | 'QUARANTINE';
  source?: string;
  device_id?: string;
  search?: string;
}

/**
 * Parsed X-ShieldCortex-Export-* integrity headers.
 *
 * `sha256`, `signature`, and `manifestId` are load-bearing: when the header
 * is absent the field is `undefined` (never ''), meaning the export CANNOT
 * be verified — treat it as unverifiable rather than comparing against an
 * empty string or building a manifest URL from ''.
 */
export interface AuditExportHeaders {
  /** Hex SHA-256 of the exact body. `undefined` when the header is absent — export is unverifiable. */
  sha256: string | undefined;
  /** Entry count. `undefined` when the header is absent, empty, or non-numeric. */
  count: number | undefined;
  generatedAt: string;
  /**
   * Manifest id (`exp_<32hex>`) for getAuditExportManifest / verifyAuditExport.
   * `undefined` when the header is absent — never '' (which would build a
   * malformed manifest URL).
   */
  manifestId: string | undefined;
  /** HMAC-SHA256 hex signature. `undefined` when the header is absent — export is unverifiable. */
  signature: string | undefined;
  signatureAlgorithm: string;
  manifestPersisted: boolean;
}

export interface AuditExportResult {
  /** Raw file body: CSV text, a bare JSON array, or a {meta, entries} envelope. */
  content: string;
  headers: AuditExportHeaders;
}

// --- Audit Ingest ---

export interface AuditIngestEntry {
  source_type: string;
  source_identifier: string;
  trust_score: number;
  sensitivity_level: string;
  firewall_result: 'ALLOW' | 'BLOCK' | 'QUARANTINE';
  anomaly_score: number;
  threat_indicators: string[];
  blocked_patterns?: string[];
  fragmentation_score?: number | null;
  reason: string;
  pipeline_duration_ms: number;
  timestamp: string;
  device_id?: string;
  device_name?: string;
  platform?: string;
}

export interface IngestResponse {
  ingested: number;
}

// --- Iron Dome Analytics (Pro+) ---

export interface IronDomeStatsQuery {
  timeRange?: '24h' | '7d' | '30d';
  device_id?: string;
}

export interface IronDomeStats {
  total_events: number;
  blocked: number;
  allowed: number;
  by_action: Record<string, number>;
  top_devices: Array<{ device_name: string | null; device_id: string; count: number }>;
}

export interface IronDomeEventsQuery {
  timeRange?: '24h' | '7d' | '30d';
  device_id?: string;
  limit?: number;
  offset?: number;
}

export interface IronDomeEvent {
  id: number;
  timestamp: string;
  source_type: string;
  source_identifier: string;
  trust_score: number;
  sensitivity_level: string;
  firewall_result: 'ALLOW' | 'BLOCK' | 'QUARANTINE';
  anomaly_score: number;
  threat_indicators: string[];
  reason: string | null;
  pipeline_duration_ms: number;
  device_id: string | null;
  device_name: string | null;
  action_type: string;
}

/** No `total` on this envelope, unlike GET /v1/audit. */
export interface IronDomeEventsResponse {
  events: IronDomeEvent[];
  pagination: Pagination;
}

// --- Audit Export Manifests ---

export interface AuditExportManifest {
  manifest_id: string;
  request_id: string;
  api_key_id: number | null;
  format: 'csv' | 'json';
  shape: 'array' | 'envelope';
  filters: {
    from: string | null;
    to: string | null;
    level: string | null;
    source: string | null;
    device_id: string | null;
    search: string | null;
  };
  entry_count: number;
  export_sha256: string;
  signature_algorithm: 'hmac-sha256';
  signature: string;
  generated_at: string;
  created_at: string;
}

export interface AuditExportsQuery {
  limit?: number;
  offset?: number;
  format?: 'csv' | 'json';
  shape?: 'array' | 'envelope';
  search?: string;
}

/** No `total` on this envelope. */
export interface AuditExportsResponse {
  manifests: AuditExportManifest[];
  pagination: Pagination;
}

export interface AuditExportManifestDetail {
  manifest: AuditExportManifest & { team_id: number };
  verification: { signature_valid: boolean; signature_algorithm: 'hmac-sha256' };
}

export interface VerifyAuditExportInput {
  export_sha256?: string;
  signature?: string;
}

export interface VerifyAuditExportResponse {
  manifest_id: string;
  verification: {
    signature_valid: boolean;
    /** null when no export_sha256 was provided to compare against. */
    sha256_matches: boolean | null;
    signature_algorithm: 'hmac-sha256';
  };
  expected: { export_sha256: string; signature: string };
}

export interface AuditExportVerificationEvent {
  id: number;
  manifest_id: string;
  request_id: string;
  api_key_id: number | null;
  provided_export_sha256: string | null;
  provided_signature: string | null;
  result_sha256_matches: boolean | null;
  result_signature_valid: boolean;
  created_at: string;
}

/** No `total` on this envelope. */
export interface AuditExportVerificationsResponse {
  events: AuditExportVerificationEvent[];
  pagination: Pagination;
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

// --- Verification (Enterprise) ---

export interface VerificationThreat {
  type: string;
  description: string;
  severity: string;
}

export interface VerificationSubmitInput {
  /** 1–50000 characters. */
  content: string;
  title?: string;
  source_type: string;
  source_identifier: string;
  anomaly_score: number;
  trust_score?: number;
  threat_indicators?: string[];
  pipeline_result: 'ALLOW' | 'BLOCK' | 'QUARANTINE';
  device_id?: string;
  device_name?: string;
  /** "async" is not implemented server-side (501); default "sync". */
  mode?: 'sync' | 'async';
}

/**
 * Synchronous POST /v1/verify result (200, not 201). Optional keys are
 * OMITTED from the JSON when the service leaves them undefined — never null.
 */
export interface VerificationSubmitResult {
  id: number;
  verdict?: 'SAFE' | 'SUSPICIOUS' | 'THREAT';
  confidence?: number;
  threats_detected?: VerificationThreat[];
  action?: 'ALERT' | 'NONE';
  cached: boolean;
  duration_ms?: number;
  status: string;
}

export interface VerificationsQuery {
  from?: string;
  to?: string;
  status?: 'pending' | 'completed' | 'failed' | 'cached';
  verdict?: 'SAFE' | 'SUSPICIOUS' | 'THREAT';
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/** List rows expose the duration as `duration_ms`; the detail uses `total_duration_ms`. */
export interface VerificationListItem {
  id: number;
  title: string | null;
  source_type: string;
  source_identifier: string;
  pipeline_result: string;
  anomaly_score: number;
  trust_score: number | null;
  verdict: string | null;
  confidence: number | null;
  action: string | null;
  status: string;
  threats_detected: VerificationThreat[] | null;
  duration_ms: number | null;
  cost_usd: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface VerificationsResponse {
  verifications: VerificationListItem[];
  total: number;
  pagination: Pagination;
}

export interface VerificationStats {
  today: {
    total: number;
    safe: number;
    suspicious: number;
    threat: number;
    error: number;
    cost_usd: number;
  };
  quota: { used: number; limit: number };
}

export interface VerificationDetail {
  id: number;
  title: string | null;
  source_type: string;
  source_identifier: string;
  pipeline_result: string;
  anomaly_score: number;
  trust_score: number | null;
  threat_indicators: string[] | null;
  verdict: string | null;
  confidence: number | null;
  reasoning: string | null;
  threats_detected: VerificationThreat[] | null;
  model_used: string | null;
  action: string | null;
  status: string;
  llm_duration_ms: number | null;
  total_duration_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  created_at: string;
  completed_at: string | null;
}

// --- Skills ---

export interface SkillScanFinding {
  pattern: string;
  severity: string;
  description: string;
  /** camelCase on the wire — preserved verbatim. */
  matchedText?: string;
}

export interface SkillIngestFile {
  file_path: string;
  skill_name: string;
  format: string;
  risk_level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  safe: boolean;
  summary?: string;
  findings?: SkillScanFinding[];
  scan_duration_ms?: number;
  trusted?: boolean;
}

export interface SkillIngestOptions {
  device_id?: string;
  device_name?: string;
  platform?: string;
  /** Any parseable date; defaults to now server-side. */
  scanned_at?: string;
}

export interface SkillIngestResponse {
  upserted: number;
  total: number;
}

export interface SkillScanRecord {
  id: number;
  file_path: string;
  skill_name: string;
  format: string;
  risk_level: string;
  safe: boolean;
  summary: string | null;
  findings: SkillScanFinding[] | null;
  scan_duration_ms: number | null;
  trusted: boolean;
  scanned_at: string | null;
  device_id: string | null;
  device_name: string | null;
}

/** Hard cap 200 rows, newest first — no pagination on this endpoint. */
export interface SkillScansResponse {
  files: SkillScanRecord[];
  total: number;
}

// --- Threats (OpenClaw realtime compat shim) ---

export interface ThreatIngestResponse {
  ingested: number;
}

// --- Incidents ---

export interface IncidentReplayQuery {
  from?: string;
  to?: string;
  device_id?: string;
  source_identifier?: string;
  project?: string;
  search?: string;
  /** 1–300, default 100. */
  limit?: number;
}

export interface IncidentEvent {
  id: string;
  timestamp: string;
  stream: 'audit' | 'verification' | 'sync' | 'memory';
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  summary: string;
  details: string | null;
  device_uuid: string | null;
  device_name: string | null;
  source_identifier: string | null;
  project: string | null;
  memory_external_id: string | null;
  metadata: Record<string, unknown>;
}

export interface IncidentReplayResponse {
  events: IncidentEvent[];
  total: number;
  summary: { audit: number; verification: number; sync: number; memory: number };
  coverage: { sources: string[]; note: string };
}

// --- Recall ---

export interface RecallExplainQuery {
  /** 2–300 characters, required. */
  query: string;
  project?: string;
  device_id?: string;
  /** 1–20, default 8. */
  limit?: number;
}

export interface RecallMemory {
  external_id: string;
  title: string;
  content: string;
  project: string | null;
  category: string;
  type: string;
  tags: string[];
  salience: number;
  scope: string;
  trust_score: number | null;
  updated_at: string;
  last_synced_at: string;
  device_uuid: string;
  device_name: string | null;
  device_platform: string | null;
}

export interface RecallResult {
  memory: RecallMemory;
  score: number;
  matched_terms: string[];
  reasons: string[];
  linked_entities: Array<{ name: string; type: string; role: string }>;
  breakdown: {
    lexical: number;
    exact_phrase: number;
    salience: number;
    recency: number;
    trust: number;
    project: number;
  };
}

export interface RecallExplainResponse {
  query: string;
  project: string | null;
  total_candidates: number;
  results: RecallResult[];
}

// --- Sync ---

export interface SyncHealthResponse {
  status: 'ok' | 'degraded';
  team_id: number;
  required_tables: string[];
  present_tables: string[];
  missing_tables: string[];
}

export interface SyncDevice {
  device_id: string;
  device_name?: string;
  platform?: string;
}

export interface SyncMemoryInput {
  external_id: string;
  local_id?: number;
  type: string;
  category: string;
  title: string;
  content: string;
  project?: string | null;
  tags?: string[];
  salience?: number;
  scope?: 'project' | 'global';
  transferable?: boolean;
  trust_score?: number | null;
  sensitivity_level?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface PushMemoriesInput {
  device: SyncDevice;
  /** 1–200 memories per batch. */
  memories: SyncMemoryInput[];
}

export interface PushMemoriesResponse {
  received: number;
  upserted: number;
  deleted: number;
  device_id: string;
}

export interface SyncedMemoriesQuery {
  device_id?: string;
  project?: string;
  search?: string;
  /**
   * `false` and `undefined` are equivalent: the server treats any PRESENT
   * value (even the string "false") as enabling deleted-memory inclusion,
   * so the client only sends this param when it is exactly `true`.
   */
  include_deleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface SyncedMemory {
  external_id: string;
  local_id: number | null;
  type: string;
  category: string;
  title: string;
  content: string;
  project: string | null;
  tags: string[];
  salience: number;
  scope: string;
  transferable: boolean;
  trust_score: number | null;
  sensitivity_level: string | null;
  source: string | null;
  metadata: Record<string, unknown>;
  review_status: 'suppressed' | 'archived' | 'canonical' | null;
  review_note: string | null;
  review_assignee: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  is_canonical: boolean;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  last_synced_at: string | null;
  device_uuid: string;
  device_name: string | null;
  device_platform: string | null;
}

export interface SyncedMemoryDeviceHealth {
  device_uuid: string;
  device_name: string | null;
  platform: string | null;
  memory_count: number;
  last_seen: string | null;
  last_synced_at: string | null;
  last_updated_at: string | null;
  status: 'healthy' | 'stale' | 'offline';
}

export interface SyncedMemoriesSummary {
  total: number;
  deleted: number;
  devices: number;
  projects: number;
  last_synced_at: string | null;
  last_updated_at: string | null;
  health: {
    healthy_devices: number;
    stale_devices: number;
    offline_devices: number;
    latest_device_sync: {
      device_uuid: string;
      device_name: string | null;
      last_synced_at: string | null;
      platform: string | null;
    } | null;
    devices: SyncedMemoryDeviceHealth[];
  };
}

export interface SyncedMemoriesResponse {
  memories: SyncedMemory[];
  total: number;
  /** OMITTED entirely on the unknown-device branch. */
  summary?: SyncedMemoriesSummary;
  pagination: Pagination;
}

export interface SyncGraphEntity {
  external_id: string;
  local_id?: number;
  name: string;
  type: string;
  aliases?: string[];
  first_seen?: string | null;
  memory_count?: number;
}

export interface SyncGraphTriple {
  external_id: string;
  local_id?: number;
  subject_external_id: string;
  predicate: string;
  object_external_id: string;
  source_memory_external_id?: string | null;
  confidence?: number | null;
  created_at?: string | null;
}

export interface SyncGraphMemoryEntity {
  memory_external_id: string;
  entity_external_id: string;
  role?: string;
}

/** At least one of the four arrays must be non-empty (server 400s otherwise). */
export interface PushMemoryGraphInput {
  device: SyncDevice;
  entities?: SyncGraphEntity[];
  triples?: SyncGraphTriple[];
  memory_entities?: SyncGraphMemoryEntity[];
  prune_memory_external_ids?: string[];
}

export interface PushMemoryGraphResponse {
  device_id: string;
  entities: number;
  triples: number;
  memory_entities: number;
  pruned_memories: number;
  orphan_entities_pruned: number;
}

// --- License ---

export interface LicenseInfo {
  tier: string;
  status: string;
  expires_at: string | null;
  created_at: string | null;
  /** OMITTED entirely (not null) on the no-licence branch. */
  last_validated_at?: string | null;
}

export interface RegenerateLicenseResponse {
  key: string;
  tier: string;
  expires_at: string;
  message: string;
}

// --- Client options ---

export interface ShieldCortexOptions {
  apiKey: string;
  baseUrl?: string;
}
