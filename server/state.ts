import crypto from 'crypto';
import {
  TelemetryPoint,
  AnomalyAlert,
  SecurityIncident,
  BlockedIpEntry,
  AllowedIpEntry,
  MitigationSettings,
  AuditLogEntry,
  TopTargetUri,
  GeoDistribution,
  DefenseMode,
  IncidentSeverity,
  AttackVectorType
} from './types.js';

export type SimulationScenario = 
  | 'NORMAL'
  | 'HTTP_GET_FLOOD'
  | 'SLOWLORIS'
  | 'CREDENTIAL_STUFFING'
  | 'VOLUMETRIC_SPIKE';

class ShieldStateStore {
  private telemetryHistory: TelemetryPoint[] = [];
  private maxTelemetryHistory = 300; // retain 5 mins of 1-second resolution
  private activeScenario: SimulationScenario = 'NORMAL';
  private scenarioStartedAt = Date.now();

  private alerts: AnomalyAlert[] = [];
  private incidents: SecurityIncident[] = [];
  private blockedIps: Map<string, BlockedIpEntry> = new Map();
  private allowedIps: Map<string, AllowedIpEntry> = new Map();
  private auditLogs: AuditLogEntry[] = [];
  private previousLogHash = '0000000000000000000000000000000000000000000000000000000000000000';

  private settings: MitigationSettings = {
    defenseMode: (process.env.DEFENSE_MODE as DefenseMode) || 'DRY_RUN',
    rpsThresholdPerIp: 80,
    burstCapacity: 120,
    autoBlockDurationMinutes: 15,
    enableAutoBlock: true,
    circuitBreakerEnabled: true,
    circuitBreakerTripped: false,
    circuitBreakerCpuThreshold: 85,
    circuitBreakerRamThreshold: 90,
    adminSafeIps: ['127.0.0.1', '::1', '10.0.0.0/8', '192.168.1.0/24'],
    privacyMaskIps: false
  };

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed trusted allowlist with anti-lockout protection
    const defaultAllowed: AllowedIpEntry[] = [
      { cidrOrIp: '127.0.0.1/32', description: 'Localhost Loopback (Operator Protected)', addedAt: Date.now() - 86400000, addedBy: 'SYSTEM_BOOTSTRAP' },
      { cidrOrIp: '192.168.1.0/24', description: 'Internal Security Operations Subnet', addedAt: Date.now() - 86400000, addedBy: 'SYSTEM_BOOTSTRAP' },
      { cidrOrIp: '173.245.48.0/20', description: 'Upstream Reverse-Proxy (Edge CDN)', addedAt: Date.now() - 86400000, addedBy: 'SYSTEM_BOOTSTRAP' }
    ];
    for (const item of defaultAllowed) {
      this.allowedIps.set(item.cidrOrIp, item);
    }

    // Seed sample blocked malicious IPs with real threat telemetry
    const initialBlocked: BlockedIpEntry[] = [
      {
        ip: '198.51.100.44',
        reason: 'Repeated HTTP GET flood on /api/v2/catalog (340 req/s)',
        blockedAt: Date.now() - 420000,
        expiresAt: Date.now() + 480000,
        hitsBlocked: 8421,
        countryCode: 'RU',
        countryName: 'Russian Federation',
        asn: 'AS49505 Hostkey B.V.'
      },
      {
        ip: '203.0.113.89',
        reason: 'Layer 7 Credential stuffing attack on /api/v1/auth/login',
        blockedAt: Date.now() - 950000,
        expiresAt: Date.now() + 150000,
        hitsBlocked: 14209,
        countryCode: 'CN',
        countryName: 'China',
        asn: 'AS4134 Chinanet'
      },
      {
        ip: '192.0.2.115',
        reason: 'Slowloris partial HTTP header starvation sockets (450 concurrent)',
        blockedAt: Date.now() - 1500000,
        expiresAt: null, // permanent manual block
        hitsBlocked: 3950,
        countryCode: 'BR',
        countryName: 'Brazil',
        asn: 'AS28573 Claro S.A.'
      }
    ];
    for (const b of initialBlocked) {
      this.blockedIps.set(b.ip, b);
    }

    // Seed realistic baseline telemetry for the past 60 seconds
    const now = Date.now();
    for (let i = 60; i >= 0; i--) {
      const ts = now - i * 1000;
      const noise = (Math.random() - 0.5) * 6;
      this.telemetryHistory.push({
        timestamp: ts,
        requestsPerSecond: Math.max(18, Math.round(28 + noise)),
        bandwidthMbps: Number((12.4 + (Math.random() - 0.5) * 2).toFixed(2)),
        cpuPercent: Math.round(22 + (Math.random() - 0.5) * 5),
        memoryPercent: 44,
        activeConnections: Math.round(140 + (Math.random() - 0.5) * 20),
        avgLatencyMs: Math.round(24 + (Math.random() - 0.5) * 4),
        p95LatencyMs: 42,
        p99LatencyMs: 68,
        errorRatePercent: 0.15,
        statusCodes: {
          '2xx': Math.round(26 + noise),
          '3xx': 1,
          '4xx': 0,
          '5xx': 0
        },
        anomalyScore: 4
      });
    }

    // Seed recent incidents
    this.incidents = [
      {
        id: 'INC-2026-081',
        title: 'Distributed Layer 7 HTTP Search Flood',
        severity: 'HIGH',
        status: 'MITIGATING',
        detectedAt: Date.now() - 1800000,
        vector: 'HTTP_GET_FLOOD',
        confidenceScore: 94,
        affectedServices: ['/api/search', '/api/v2/catalog', 'ElasticSearch Cluster'],
        peakRps: 680,
        peakBandwidthMbps: 48.5,
        suspiciousIpCount: 48,
        evidence: [
          { key: 'RPS Surge', detail: '+740% above moving 15m baseline (baseline 32 req/s)' },
          { key: 'URI Concentration', detail: '89.2% of total incoming requests targeted /api/search?q=randomHex' },
          { key: 'User-Agent Pattern', detail: 'Missing or randomized Python-requests / HeadlessChrome' },
          { key: 'IP Entropy', detail: '48 rotating IPs generating identical query parameter structure' }
        ],
        mitigationHistory: [
          { timestamp: Date.now() - 1740000, action: 'Rate limiter engaged for /api/search (max 20 req/s/IP)', enforced: true, operator: 'AUTOMATED_DEFENSE' },
          { timestamp: Date.now() - 1680000, action: '48 hostile IP addresses temporarily quarantined (15 min TTL)', enforced: true, operator: 'AUTOMATED_DEFENSE' }
        ],
        notes: [
          { id: 'NOTE-1', timestamp: Date.now() - 1700000, author: 'AutoDefense Bot', text: 'Anomaly score surpassed 85. Rate limiting enforced under DRY_RUN -> ENFORCING mode.' },
          { id: 'NOTE-2', timestamp: Date.now() - 1500000, author: 'SecOps Engineer (Alex)', text: 'Confirmed botnet scan. Backend latency dropping back to 35ms. Monitoring cool-off.' }
        ],
        aiAnalysis: {
          attackClassification: 'Layer 7 Application-Exhaustion HTTP GET Flood',
          confidence: 96,
          rootCauseHypothesis: 'Targeted database CPU resource exhaustion attack abusing expensive wildcard search queries on /api/search.',
          falsePositiveLikelihood: 'LOW',
          falsePositiveReasoning: 'Traffic pattern exhibits high entropy query string randomization, lack of static asset requests, and non-standard browser cipher suites.',
          blastRadius: 'Search microservice degraded. Main commerce checkout and auth endpoints remained operational.',
          recommendedMitigationPolicy: {
            immediateAction: 'Enforce challenge token (CAPTCHA / proof-of-work) on unauthenticated /api/search requests exceeding 15 req/s.',
            rateLimitAdjustment: 'Tighten per-IP burst to 25 requests and implement caching on identical query prefixes.',
            suggestedWafRule: 'deny_if(req.path.startsWith("/api/search") && req.rate_10s > 50)'
          },
          executiveSummary: 'Automated mitigation successfully contained the spike within 120 seconds. 48 IPs quarantined with 0 verified false positive customer complaints.',
          analyzedAt: Date.now() - 1650000
        }
      },
      {
        id: 'INC-2026-079',
        title: 'Slowloris Sockets Connection Starvation',
        severity: 'MEDIUM',
        status: 'RESOLVED',
        detectedAt: Date.now() - 7200000,
        resolvedAt: Date.now() - 5400000,
        vector: 'SLOWLORIS_CONNECTION_STARVATION',
        confidenceScore: 89,
        affectedServices: ['Edge Reverse Proxy', 'Socket Pool'],
        peakRps: 12,
        peakBandwidthMbps: 0.8,
        suspiciousIpCount: 16,
        evidence: [
          { key: 'Connection Duration', detail: '450 concurrent sockets held open > 280 seconds with 10-byte interval chunks' },
          { key: 'Bandwidth vs Sockets', detail: 'Extremely low bandwidth (0.8 Mbps) with 94% worker thread saturation' }
        ],
        mitigationHistory: [
          { timestamp: Date.now() - 7100000, action: 'Client header timeout lowered to 5s and slow-rate dropped', enforced: true, operator: 'SYSTEM_WAF' },
          { timestamp: Date.now() - 5400000, action: 'Incident marked RESOLVED after socket pool returned to normal state', enforced: true, operator: 'SecOps Lead' }
        ],
        notes: [
          { id: 'NOTE-3', timestamp: Date.now() - 5400000, author: 'SecOps Lead', text: 'Resolved. Nginx client_body_timeout and client_header_timeout hardened in production.' }
        ]
      }
    ];

    // Seed audit logs
    this.addAuditLog('SYSTEM_BOOT', 'SYSTEM_BOOTSTRAP', undefined, 'SUCCESS', 'DDoS Shield AI 2.0 initialized with safe dry-run defaults');
    this.addAuditLog('RULE_ALLOWLIST_SEED', 'SYSTEM_BOOTSTRAP', '127.0.0.1/32', 'SUCCESS', 'Operator anti-lockout whitelist established');
    this.addAuditLog('RATE_LIMIT_POLICY_ACTIVE', 'SYSTEM_BOOTSTRAP', 'GLOBAL', 'SUCCESS', 'Configured per-IP threshold at 80 RPS with burst allowance 120');
  }

  public getSettings(): MitigationSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<MitigationSettings>, operator = 'OPERATOR'): MitigationSettings {
    const oldMode = this.settings.defenseMode;
    this.settings = { ...this.settings, ...partial };
    
    if (partial.defenseMode && partial.defenseMode !== oldMode) {
      this.addAuditLog(
        'DEFENSE_MODE_CHANGED',
        operator,
        `From ${oldMode} to ${partial.defenseMode}`,
        'SUCCESS',
        `Mitigation defense mode toggled to ${partial.defenseMode}`
      );
    } else {
      this.addAuditLog(
        'MITIGATION_POLICY_UPDATED',
        operator,
        'SETTINGS',
        'SUCCESS',
        `Updated settings: ${Object.keys(partial).join(', ')}`
      );
    }
    return this.getSettings();
  }

  public isAdminSafeIp(ip: string): boolean {
    const trimmed = ip.trim().replace(/^::ffff:/, '');
    if (trimmed === '127.0.0.1' || trimmed === '::1' || trimmed === 'localhost') {
      return true;
    }
    for (const allowed of this.allowedIps.values()) {
      if (allowed.cidrOrIp.includes(trimmed) || trimmed.startsWith('10.') || trimmed.startsWith('192.168.')) {
        return true;
      }
    }
    return false;
  }

  public blockIp(
    ip: string,
    reason: string,
    durationMinutes: number | null,
    operator = 'OPERATOR',
    countryCode = 'XX',
    countryName = 'Unknown Origin',
    asn = 'Unknown ASN'
  ): { success: boolean; message: string; entry?: BlockedIpEntry } {
    if (this.isAdminSafeIp(ip)) {
      this.addAuditLog(
        'BLOCK_REJECTED_ADMIN_LOCKOUT_PROTECTION',
        operator,
        ip,
        'DENIED',
        `Attempt to block operator/admin IP ${ip} was safely intercepted and rejected.`
      );
      return { success: false, message: `Cannot block IP ${ip}: Protected by Anti-Lockout Administrator Safety Policy.` };
    }

    const expiresAt = durationMinutes ? Date.now() + durationMinutes * 60 * 1000 : null;
    const entry: BlockedIpEntry = {
      ip,
      reason,
      blockedAt: Date.now(),
      expiresAt,
      hitsBlocked: 0,
      countryCode,
      countryName,
      asn
    };

    this.blockedIps.set(ip, entry);
    this.addAuditLog(
      'IP_BLOCKED',
      operator,
      ip,
      this.settings.defenseMode === 'DRY_RUN' ? 'DRY_RUN' : 'SUCCESS',
      `Blocked ${ip} (${durationMinutes ? `${durationMinutes}m` : 'Permanent'}) - Reason: ${reason}`
    );

    return { success: true, message: `IP ${ip} quarantined successfully.`, entry };
  }

  public unblockIp(ip: string, operator = 'OPERATOR'): boolean {
    if (this.blockedIps.has(ip)) {
      this.blockedIps.delete(ip);
      this.addAuditLog('IP_UNBLOCKED', operator, ip, 'SUCCESS', `Manually removed ${ip} from quarantine blocklist.`);
      return true;
    }
    return false;
  }

  public getBlockedIps(): BlockedIpEntry[] {
    const now = Date.now();
    // Clean up expired blocks
    for (const [ip, entry] of this.blockedIps.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.blockedIps.delete(ip);
        this.addAuditLog('IP_EXPIRED_AUTO_RECOVERY', 'SYSTEM_AUTO_RECOVERY', ip, 'SUCCESS', `Temporary ban expired for ${ip}. Traffic allowed.`);
      }
    }
    return Array.from(this.blockedIps.values()).map(b => {
      if (this.settings.privacyMaskIps) {
        return {
          ...b,
          ip: this.maskIp(b.ip)
        };
      }
      return b;
    });
  }

  public addAllowedIp(cidrOrIp: string, description: string, addedBy = 'OPERATOR'): AllowedIpEntry {
    const entry: AllowedIpEntry = {
      cidrOrIp,
      description,
      addedAt: Date.now(),
      addedBy
    };
    this.allowedIps.set(cidrOrIp, entry);
    this.addAuditLog('ALLOWLIST_ENTRY_ADDED', addedBy, cidrOrIp, 'SUCCESS', `Added trusted address: ${description}`);
    return entry;
  }

  public removeAllowedIp(cidrOrIp: string, operator = 'OPERATOR'): boolean {
    if (cidrOrIp === '127.0.0.1/32' || cidrOrIp === '127.0.0.1') {
      this.addAuditLog('ALLOWLIST_DELETE_REJECTED', operator, cidrOrIp, 'DENIED', 'Cannot remove loopback safe IP');
      return false;
    }
    const deleted = this.allowedIps.delete(cidrOrIp);
    if (deleted) {
      this.addAuditLog('ALLOWLIST_ENTRY_REMOVED', operator, cidrOrIp, 'SUCCESS', `Removed ${cidrOrIp} from allowlist.`);
    }
    return deleted;
  }

  public getAllowedIps(): AllowedIpEntry[] {
    return Array.from(this.allowedIps.values());
  }

  public addAuditLog(
    action: string,
    operator: string,
    target: string | undefined,
    result: 'SUCCESS' | 'WARNING' | 'DENIED' | 'DRY_RUN',
    details: string
  ): AuditLogEntry {
    const id = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = Date.now();
    const dataToHash = `${this.previousLogHash}|${id}|${timestamp}|${action}|${operator}|${target || ''}|${result}|${details}`;
    const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
    this.previousLogHash = hash;

    const entry: AuditLogEntry = {
      id,
      timestamp,
      action,
      operator,
      target,
      result,
      details,
      hash
    };

    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    return entry;
  }

  public getAuditLogs(limit = 100): AuditLogEntry[] {
    return this.auditLogs.slice(0, limit);
  }

  public getIncidents(): SecurityIncident[] {
    return [...this.incidents];
  }

  public getIncidentById(id: string): SecurityIncident | undefined {
    return this.incidents.find(i => i.id === id);
  }

  public updateIncidentStatus(id: string, status: SecurityIncident['status'], operator = 'OPERATOR'): SecurityIncident | null {
    const inc = this.incidents.find(i => i.id === id);
    if (!inc) return null;
    const oldStatus = inc.status;
    inc.status = status;
    if (status === 'RESOLVED' || status === 'FALSE_POSITIVE') {
      inc.resolvedAt = Date.now();
    }
    this.addAuditLog('INCIDENT_STATUS_UPDATE', operator, inc.id, 'SUCCESS', `Incident ${inc.id} status changed from ${oldStatus} to ${status}`);
    return inc;
  }

  public addIncidentNote(id: string, text: string, author = 'OPERATOR'): SecurityIncident | null {
    const inc = this.incidents.find(i => i.id === id);
    if (!inc) return null;
    inc.notes.push({
      id: `NOTE-${Date.now()}`,
      timestamp: Date.now(),
      author,
      text
    });
    this.addAuditLog('INCIDENT_NOTE_ADDED', author, inc.id, 'SUCCESS', `Added note to incident ${inc.id}`);
    return inc;
  }

  public attachAiAnalysis(id: string, analysis: SecurityIncident['aiAnalysis']): SecurityIncident | null {
    const inc = this.incidents.find(i => i.id === id);
    if (!inc) return null;
    inc.aiAnalysis = analysis;
    this.addAuditLog('AI_ANALYSIS_COMPLETED', 'GEMINI_AI_REASONING', inc.id, 'SUCCESS', `AI Incident diagnosis recorded: ${analysis?.attackClassification}`);
    return inc;
  }

  public getAlerts(): AnomalyAlert[] {
    return [...this.alerts].slice(0, 30);
  }

  public addAlert(alert: AnomalyAlert) {
    this.alerts.unshift(alert);
    if (this.alerts.length > 100) {
      this.alerts.pop();
    }

    // Check if this anomaly should create or update an active incident
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
      const activeInc = this.incidents.find(i => (i.status === 'OPEN' || i.status === 'INVESTIGATING' || i.status === 'MITIGATING') && i.vector === alert.vector);
      if (!activeInc) {
        const newInc: SecurityIncident = {
          id: `INC-2026-${Math.floor(100 + Math.random() * 900)}`,
          title: alert.title,
          severity: alert.severity,
          status: 'OPEN',
          detectedAt: alert.timestamp,
          vector: alert.vector,
          confidenceScore: alert.confidenceScore,
          affectedServices: ['Edge Gateway', 'Application Services'],
          peakRps: typeof alert.indicators[0]?.observedValue === 'number' ? alert.indicators[0].observedValue : 250,
          peakBandwidthMbps: 28.4,
          suspiciousIpCount: 12,
          evidence: alert.indicators.map(ind => ({
            key: ind.name,
            detail: `Observed ${ind.observedValue} (baseline: ${ind.baselineValue}) -> Deviation: ${ind.deviation}`
          })),
          mitigationHistory: alert.dryRunAction ? [
            { timestamp: Date.now(), action: alert.dryRunAction, enforced: this.settings.defenseMode === 'ENFORCING', operator: 'AUTO_DETECTOR' }
          ] : [],
          notes: [
            { id: `NOTE-${Date.now()}`, timestamp: Date.now(), author: 'Anomaly Engine', text: alert.explanation }
          ]
        };
        this.incidents.unshift(newInc);
        this.addAuditLog('SECURITY_INCIDENT_ESCALATED', 'ANOMALY_ENGINE', newInc.id, 'WARNING', `Created new incident: ${newInc.title} (${newInc.severity})`);
      }
    }
  }

  public setScenario(scenario: SimulationScenario, operator = 'OPERATOR') {
    this.activeScenario = scenario;
    this.scenarioStartedAt = Date.now();
    this.addAuditLog('SIMULATION_SCENARIO_CHANGED', operator, scenario, 'SUCCESS', `Traffic simulator scenario set to ${scenario}`);
  }

  public getActiveScenario(): { scenario: SimulationScenario; startedAt: number } {
    return { scenario: this.activeScenario, startedAt: this.scenarioStartedAt };
  }

  // Called on each 1-second telemetry tick to generate dynamic telemetry
  public generateNextTelemetryPoint(): TelemetryPoint {
    const elapsedSec = (Date.now() - this.scenarioStartedAt) / 1000;
    let rps = 25;
    let bandwidth = 14.5;
    let cpu = 24;
    let ram = 45;
    let activeConn = 145;
    let latency = 22;
    let errorRate = 0.2;
    let anomalyScore = 5;

    switch (this.activeScenario) {
      case 'HTTP_GET_FLOOD': {
        // High RPS flood with severe CPU spike and degraded response times
        const ramp = Math.min(1, elapsedSec / 10);
        rps = Math.round(30 + ramp * (550 + Math.random() * 120));
        bandwidth = Number((14 + ramp * (65 + Math.random() * 15)).toFixed(2));
        cpu = Math.min(96, Math.round(25 + ramp * 62 + Math.random() * 5));
        ram = Math.min(88, Math.round(45 + ramp * 35));
        activeConn = Math.round(150 + ramp * 1200);
        latency = Math.round(22 + ramp * (320 + Math.random() * 80));
        errorRate = Number((0.2 + ramp * (14.5 + Math.random() * 4)).toFixed(2));
        anomalyScore = Math.min(98, Math.round(30 + ramp * 65));
        break;
      }
      case 'SLOWLORIS': {
        // Low bandwidth, moderate RPS, but massive connection count and socket starvation
        const ramp = Math.min(1, elapsedSec / 15);
        rps = Math.round(28 + (Math.random() - 0.5) * 8);
        bandwidth = Number((1.2 + Math.random() * 0.4).toFixed(2));
        cpu = Math.round(42 + ramp * 38);
        ram = Math.round(52 + ramp * 25);
        activeConn = Math.round(150 + ramp * 2400);
        latency = Math.round(25 + ramp * 980);
        errorRate = Number((0.2 + ramp * 22.4).toFixed(2));
        anomalyScore = Math.min(94, Math.round(20 + ramp * 70));
        break;
      }
      case 'CREDENTIAL_STUFFING': {
        // Concentrated POST requests on auth endpoint with massive 401/403/429 spikes
        const ramp = Math.min(1, elapsedSec / 8);
        rps = Math.round(25 + ramp * (180 + Math.random() * 40));
        bandwidth = Number((15 + ramp * 18).toFixed(2));
        cpu = Math.round(30 + ramp * 35);
        ram = 48;
        activeConn = Math.round(160 + ramp * 350);
        latency = Math.round(24 + ramp * 65);
        errorRate = Number((0.5 + ramp * 48.0).toFixed(2)); // High 4xx rate
        anomalyScore = Math.min(92, Math.round(25 + ramp * 65));
        break;
      }
      case 'VOLUMETRIC_SPIKE': {
        // High Mbps bandwidth saturation
        const ramp = Math.min(1, elapsedSec / 5);
        rps = Math.round(40 + ramp * (850 + Math.random() * 200));
        bandwidth = Number((15 + ramp * (380 + Math.random() * 80)).toFixed(2));
        cpu = Math.min(98, Math.round(25 + ramp * 68));
        ram = Math.min(92, Math.round(45 + ramp * 40));
        activeConn = Math.round(200 + ramp * 2800);
        latency = Math.round(25 + ramp * 450);
        errorRate = Number((0.2 + ramp * 32).toFixed(2));
        anomalyScore = 99;
        break;
      }
      case 'NORMAL':
      default: {
        rps = Math.max(15, Math.round(28 + (Math.random() - 0.5) * 8));
        bandwidth = Number((12.5 + (Math.random() - 0.5) * 3).toFixed(2));
        cpu = Math.round(22 + (Math.random() - 0.5) * 6);
        ram = 44;
        activeConn = Math.round(140 + (Math.random() - 0.5) * 20);
        latency = Math.round(24 + (Math.random() - 0.5) * 5);
        errorRate = Number((0.15 + Math.random() * 0.1).toFixed(2));
        anomalyScore = Math.round(4 + Math.random() * 4);
        break;
      }
    }

    // Auto Circuit Breaker check
    if (this.settings.circuitBreakerEnabled) {
      if (cpu >= this.settings.circuitBreakerCpuThreshold || ram >= this.settings.circuitBreakerRamThreshold) {
        if (!this.settings.circuitBreakerTripped) {
          this.settings.circuitBreakerTripped = true;
          this.addAuditLog(
            'CIRCUIT_BREAKER_TRIPPED',
            'DEFENSE_ENGINE',
            'SYSTEM',
            'WARNING',
            `Circuit breaker automatically TRIPPED: CPU=${cpu}%, RAM=${ram}%. Graceful degradation enabled.`
          );
        }
      } else if (this.settings.circuitBreakerTripped && cpu < this.settings.circuitBreakerCpuThreshold - 10) {
        this.settings.circuitBreakerTripped = false;
        this.addAuditLog(
          'CIRCUIT_BREAKER_RECOVERED',
          'DEFENSE_ENGINE',
          'SYSTEM',
          'SUCCESS',
          `System load normalized (CPU=${cpu}%). Circuit breaker reset to standby.`
        );
      }
    }

    const totalStatusReqs = rps;
    const errors = Math.round(totalStatusReqs * (errorRate / 100));
    const ok = Math.max(0, totalStatusReqs - errors);

    const point: TelemetryPoint = {
      timestamp: Date.now(),
      requestsPerSecond: rps,
      bandwidthMbps: bandwidth,
      cpuPercent: cpu,
      memoryPercent: ram,
      activeConnections: activeConn,
      avgLatencyMs: latency,
      p95LatencyMs: Math.round(latency * 1.6),
      p99LatencyMs: Math.round(latency * 2.4),
      errorRatePercent: errorRate,
      statusCodes: {
        '2xx': Math.round(ok * 0.95),
        '3xx': Math.round(ok * 0.05),
        '4xx': Math.round(errors * (this.activeScenario === 'CREDENTIAL_STUFFING' ? 0.9 : 0.4)),
        '5xx': Math.round(errors * (this.activeScenario === 'CREDENTIAL_STUFFING' ? 0.1 : 0.6))
      },
      anomalyScore
    };

    this.telemetryHistory.push(point);
    if (this.telemetryHistory.length > this.maxTelemetryHistory) {
      this.telemetryHistory.shift();
    }

    return point;
  }

  public getLatestTelemetry(): TelemetryPoint {
    if (this.telemetryHistory.length === 0) {
      return this.generateNextTelemetryPoint();
    }
    return this.telemetryHistory[this.telemetryHistory.length - 1];
  }

  public getTelemetryHistory(count = 60): TelemetryPoint[] {
    return this.telemetryHistory.slice(-count);
  }

  public getTopTargetUris(): TopTargetUri[] {
    const isUnderAttack = this.activeScenario !== 'NORMAL';
    if (this.activeScenario === 'HTTP_GET_FLOOD') {
      return [
        { uri: '/api/search', requestsCount: 14280, bandwidthMb: 84.2, errorRate: 18.4, threatLevel: 'TARGETED' },
        { uri: '/api/v2/catalog/items', requestsCount: 8940, bandwidthMb: 52.1, errorRate: 9.2, threatLevel: 'ELEVATED' },
        { uri: '/health', requestsCount: 1420, bandwidthMb: 1.1, errorRate: 0.0, threatLevel: 'NORMAL' },
        { uri: '/api/v1/user/profile', requestsCount: 940, bandwidthMb: 2.8, errorRate: 1.2, threatLevel: 'NORMAL' },
        { uri: '/static/bundle.js', requestsCount: 650, bandwidthMb: 18.4, errorRate: 0.0, threatLevel: 'NORMAL' }
      ];
    }
    if (this.activeScenario === 'CREDENTIAL_STUFFING') {
      return [
        { uri: '/api/v1/auth/login', requestsCount: 18450, bandwidthMb: 22.8, errorRate: 64.2, threatLevel: 'TARGETED' },
        { uri: '/api/v1/auth/reset-password', requestsCount: 3410, bandwidthMb: 5.4, errorRate: 42.1, threatLevel: 'ELEVATED' },
        { uri: '/api/v1/user/profile', requestsCount: 1200, bandwidthMb: 3.1, errorRate: 0.8, threatLevel: 'NORMAL' },
        { uri: '/api/search', requestsCount: 850, bandwidthMb: 4.2, errorRate: 0.5, threatLevel: 'NORMAL' },
        { uri: '/health', requestsCount: 780, bandwidthMb: 0.6, errorRate: 0.0, threatLevel: 'NORMAL' }
      ];
    }
    return [
      { uri: '/api/search', requestsCount: 1850, bandwidthMb: 9.4, errorRate: 0.2, threatLevel: 'NORMAL' },
      { uri: '/api/v2/catalog/items', requestsCount: 1420, bandwidthMb: 14.8, errorRate: 0.1, threatLevel: 'NORMAL' },
      { uri: '/api/v1/auth/login', requestsCount: 920, bandwidthMb: 1.2, errorRate: 1.4, threatLevel: 'NORMAL' },
      { uri: '/static/bundle.js', requestsCount: 880, bandwidthMb: 22.1, errorRate: 0.0, threatLevel: 'NORMAL' },
      { uri: '/health', requestsCount: 640, bandwidthMb: 0.5, errorRate: 0.0, threatLevel: 'NORMAL' }
    ];
  }

  public getGeoDistribution(): GeoDistribution[] {
    if (this.activeScenario === 'HTTP_GET_FLOOD' || this.activeScenario === 'VOLUMETRIC_SPIKE') {
      return [
        { countryCode: 'US', countryName: 'United States', requestCount: 24500, percentage: 38, threatPercentage: 12 },
        { countryCode: 'RU', countryName: 'Russian Federation', requestCount: 18900, percentage: 29, threatPercentage: 78 },
        { countryCode: 'CN', countryName: 'China', requestCount: 11200, percentage: 17, threatPercentage: 62 },
        { countryCode: 'BR', countryName: 'Brazil', requestCount: 5800, percentage: 9, threatPercentage: 45 },
        { countryCode: 'DE', countryName: 'Germany', requestCount: 4500, percentage: 7, threatPercentage: 5 }
      ];
    }
    return [
      { countryCode: 'US', countryName: 'United States', requestCount: 8500, percentage: 48, threatPercentage: 2 },
      { countryCode: 'DE', countryName: 'Germany', requestCount: 3200, percentage: 18, threatPercentage: 1 },
      { countryCode: 'GB', countryName: 'United Kingdom', requestCount: 2600, percentage: 15, threatPercentage: 1 },
      { countryCode: 'JP', countryName: 'Japan', requestCount: 1800, percentage: 10, threatPercentage: 0 },
      { countryCode: 'CA', countryName: 'Canada', requestCount: 1500, percentage: 9, threatPercentage: 1 }
    ];
  }

  public maskIp(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    return ip.replace(/:[^:]+$/, ':****');
  }
}

export const shieldState = new ShieldStateStore();
