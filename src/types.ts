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

// --- Audit ---

export interface AuditQuery {
  from?: string;
  to?: string;
  level?: 'ALLOW' | 'BLOCK' | 'QUARANTINE';
  limit?: number;
  offset?: number;
}

export interface AuditEntry {
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
}

export interface AuditResponse {
  logs: AuditEntry[];
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

// --- Client options ---

export interface ShieldCortexOptions {
  apiKey: string;
  baseUrl?: string;
}
