export type DefenseMode = 'DRY_RUN' | 'ENFORCING' | 'LOCKDOWN';

export type IncidentSeverity = 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'MITIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';

export type AttackVectorType = 
  | 'VOLUMETRIC_FLOOD'
  | 'HTTP_GET_FLOOD'
  | 'SLOWLORIS_CONNECTION_STARVATION'
  | 'CREDENTIAL_STUFFING_L7'
  | 'URI_RANDOMIZATION_SCAN'
  | 'DNS_NTP_AMPLIFICATION'
  | 'BENIGN_TRAFFIC_SURGE';

export interface TelemetryPoint {
  timestamp: number; // Unix epoch ms
  requestsPerSecond: number;
  bandwidthMbps: number;
  cpuPercent: number;
  memoryPercent: number;
  activeConnections: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRatePercent: number;
  statusCodes: {
    '2xx': number;
    '3xx': number;
    '4xx': number;
    '5xx': number;
  };
  anomalyScore: number; // 0 - 100
}

export interface AnomalyAlert {
  id: string;
  timestamp: number;
  title: string;
  severity: IncidentSeverity;
  confidenceScore: number; // 0 - 100
  vector: AttackVectorType;
  indicators: {
    name: string;
    observedValue: string | number;
    baselineValue: string | number;
    deviation: string;
  }[];
  explanation: string;
  recommendedAction: string;
  mitigated: boolean;
  dryRunAction?: string;
}

export interface IncidentNote {
  id: string;
  timestamp: number;
  author: string;
  text: string;
}

export interface SecurityIncident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  detectedAt: number;
  resolvedAt?: number;
  vector: AttackVectorType;
  confidenceScore: number;
  affectedServices: string[];
  peakRps: number;
  peakBandwidthMbps: number;
  suspiciousIpCount: number;
  evidence: {
    key: string;
    detail: string;
  }[];
  mitigationHistory: {
    timestamp: number;
    action: string;
    enforced: boolean;
    operator: string;
  }[];
  notes: IncidentNote[];
  aiAnalysis?: AiIncidentAnalysis;
}

export interface AiIncidentAnalysis {
  attackClassification: string;
  confidence: number;
  rootCauseHypothesis: string;
  falsePositiveLikelihood: 'LOW' | 'MEDIUM' | 'HIGH';
  falsePositiveReasoning: string;
  blastRadius: string;
  recommendedMitigationPolicy: {
    immediateAction: string;
    rateLimitAdjustment: string;
    suggestedWafRule: string;
  };
  executiveSummary: string;
  analyzedAt: number;
}

export interface BlockedIpEntry {
  ip: string;
  reason: string;
  blockedAt: number;
  expiresAt: number | null; // null = permanent
  hitsBlocked: number;
  countryCode: string;
  countryName: string;
  asn: string;
}

export interface AllowedIpEntry {
  cidrOrIp: string;
  description: string;
  addedAt: number;
  addedBy: string;
}

export interface MitigationSettings {
  defenseMode: DefenseMode;
  rpsThresholdPerIp: number;
  burstCapacity: number;
  autoBlockDurationMinutes: number;
  enableAutoBlock: boolean;
  circuitBreakerEnabled: boolean;
  circuitBreakerTripped: boolean;
  circuitBreakerCpuThreshold: number;
  circuitBreakerRamThreshold: number;
  adminSafeIps: string[];
  privacyMaskIps: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string;
  operator: string;
  target?: string;
  result: 'SUCCESS' | 'WARNING' | 'DENIED' | 'DRY_RUN';
  details: string;
  hash: string;
}

export interface TopTargetUri {
  uri: string;
  requestsCount: number;
  bandwidthMb: number;
  errorRate: number;
  threatLevel: 'NORMAL' | 'ELEVATED' | 'TARGETED';
}

export interface GeoDistribution {
  countryCode: string;
  countryName: string;
  requestCount: number;
  percentage: number;
  threatPercentage: number;
}
