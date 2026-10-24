import { shieldState } from './state.js';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  requestCountInWindow: number;
  windowStart: number;
}

export class MitigationEngine {
  // In-memory token bucket store per client IP
  private buckets: Map<string, TokenBucket> = new Map();

  /**
   * Evaluates an incoming request against active defensive policies
   */
  public evaluateRequest(clientIp: string, path: string, method: string, requestSizeBytes: number): {
    allowed: boolean;
    status: number;
    reason?: string;
    isDryRun: boolean;
    remainingTokens: number;
  } {
    const settings = shieldState.getSettings();
    const isDryRun = settings.defenseMode === 'DRY_RUN';

    // Rule 1: Admin Safe-List Anti-Lockout Check
    if (shieldState.isAdminSafeIp(clientIp)) {
      return { allowed: true, status: 200, isDryRun, remainingTokens: 999 };
    }

    // Rule 2: Request Size Limits (prevent payload exhaustion / large buffer attacks)
    const MAX_ALLOWED_BODY_BYTES = 5 * 1024 * 1024; // 5 MB limit
    if (requestSizeBytes > MAX_ALLOWED_BODY_BYTES) {
      if (!isDryRun && settings.defenseMode !== 'DRY_RUN') {
        shieldState.addAuditLog('REQUEST_PAYLOAD_EXCEEDED', 'DEFENSE_ENGINE', clientIp, 'DENIED', `Blocked request of size ${requestSizeBytes} bytes (Limit: 5MB)`);
        return { allowed: false, status: 413, reason: 'Payload Too Large: Exceeds 5MB defensive shield quota', isDryRun, remainingTokens: 0 };
      }
    }

    // Rule 3: Check Blocklist
    const blockedList = shieldState.getBlockedIps();
    const isBlocked = blockedList.some(b => b.ip === clientIp || b.ip === clientIp.replace(/^::ffff:/, ''));
    if (isBlocked) {
      if (!isDryRun) {
        return { allowed: false, status: 403, reason: 'Access Denied: Source IP is actively quarantined by DDoS Shield AI', isDryRun, remainingTokens: 0 };
      }
    }

    // Rule 4: Circuit Breaker Evaluation
    if (settings.circuitBreakerTripped) {
      // Degrade non-critical endpoints when circuit breaker is active
      const isCritical = path.startsWith('/api/health') || path.startsWith('/health') || path.startsWith('/api/telemetry');
      if (!isCritical) {
        if (!isDryRun) {
          return { allowed: false, status: 503, reason: 'Service Temporarily Degraded: Automated Circuit Breaker is shedding load (Retry-After: 30s)', isDryRun, remainingTokens: 0 };
        }
      }
    }

    // Rule 5: Token Bucket Rate Limiting per IP
    const now = Date.now();
    let bucket = this.buckets.get(clientIp);
    const capacity = settings.burstCapacity;
    const refillRatePerMs = settings.rpsThresholdPerIp / 1000;

    if (!bucket) {
      bucket = {
        tokens: capacity,
        lastRefill: now,
        requestCountInWindow: 0,
        windowStart: now
      };
      this.buckets.set(clientIp, bucket);
    }

    // Refill tokens
    const timePassedMs = now - bucket.lastRefill;
    bucket.tokens = Math.min(capacity, bucket.tokens + timePassedMs * refillRatePerMs);
    bucket.lastRefill = now;

    // Track 1-minute window
    if (now - bucket.windowStart > 60000) {
      bucket.windowStart = now;
      bucket.requestCountInWindow = 0;
    }
    bucket.requestCountInWindow++;

    // Consume 1 token
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return { allowed: true, status: 200, isDryRun, remainingTokens: Math.floor(bucket.tokens) };
    } else {
      // Token bucket exhausted!
      if (isDryRun) {
        shieldState.addAuditLog(
          'RATE_LIMIT_EXCEEDED_DRY_RUN',
          'DEFENSE_ENGINE',
          clientIp,
          'DRY_RUN',
          `[DRY-RUN] Client ${clientIp} exceeded ${settings.rpsThresholdPerIp} RPS threshold on ${path}. Action logged without dropping.`
        );
        return { allowed: true, status: 200, reason: 'Dry-Run Rate Limit Exceeded', isDryRun: true, remainingTokens: 0 };
      } else {
        shieldState.addAuditLog(
          'RATE_LIMIT_ENFORCED',
          'DEFENSE_ENGINE',
          clientIp,
          'DENIED',
          `Rate limit enforced (429) for ${clientIp} on ${path}. Burst exceeded.`
        );
        return { allowed: false, status: 429, reason: `Too Many Requests: Rate limit of ${settings.rpsThresholdPerIp} RPS exceeded. Try again in a few seconds.`, isDryRun: false, remainingTokens: 0 };
      }
    }
  }

  /**
   * Generates production-ready NGINX reverse-proxy configuration snippet
   */
  public generateNginxConfig(): string {
    const settings = shieldState.getSettings();
    const blocked = shieldState.getBlockedIps();
    const allowed = shieldState.getAllowedIps();

    return `# ==============================================================================
# DDoS Shield AI 2.0 - Generated NGINX Security & Rate-Limiting Configuration
# Generated at: ${new Date().toISOString()}
# Mode: ${settings.defenseMode}
# ==============================================================================

# 1. Rate Limiting Zones (Token Bucket per remote client IP)
limit_req_zone $binary_remote_addr zone=ddos_shield_per_ip:10m rate=${settings.rpsThresholdPerIp}r/s;
limit_conn_zone $binary_remote_addr zone=ddos_shield_conn:10m;

# 2. Slowloris & Low-and-Slow Attack Mitigation (Socket Timings)
client_body_timeout 10s;
client_header_timeout 10s;
keepalive_timeout 30s 15s;
send_timeout 10s;
client_max_body_size 5M;

# 3. Trusted Allowlist (Bypasses Rate Limiting)
geo $shield_trusted_client {
    default 0;
${allowed.map(a => `    ${a.cidrOrIp.padEnd(24)} 1; # ${a.description}`).join('\n')}
}

# 4. Quarantined Hostile IP Deny List (${blocked.length} Active Blocks)
${blocked.map(b => `deny ${b.ip}; # ${b.reason} [Hits: ${b.hitsBlocked}]`).join('\n')}

# 5. Upstream Server Block Configuration
server {
    listen 80;
    server_name example.com;

    # Rate Limiting with Burst Allowance
    limit_req zone=ddos_shield_per_ip burst=${settings.burstCapacity} nodelay;
    limit_conn ddos_shield_conn 50;

    # Custom 429 & 503 Error Pages
    error_page 429 = @rate_limited;
    error_page 503 = @circuit_breaker;

    location @rate_limited {
        default_type application/json;
        return 429 '{"error":"Too Many Requests","shield":"DDoS Shield AI 2.0","retry_after":15}';
    }

    location @circuit_breaker {
        default_type application/json;
        return 503 '{"error":"Service Degraded","shield":"DDoS Shield AI 2.0","status":"load_shedding"}';
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;
  }

  /**
   * Generates Cloudflare WAF JSON expressions / Terraform rules
   */
  public generateCloudflareWafRules(): string {
    const settings = shieldState.getSettings();
    const blocked = shieldState.getBlockedIps();

    const blockedIpList = blocked.map(b => `"${b.ip}"`).join(', ');

    return JSON.stringify({
      schema_version: '2026.1',
      shield_mode: settings.defenseMode,
      rules: [
        {
          action: 'block',
          description: 'DDoS Shield AI 2.0 Quarantined Abusers',
          expression: `ip.src in {${blockedIpList || '"198.51.100.44"'}}`,
          enabled: true
        },
        {
          action: 'rate_limit',
          description: 'DDoS Shield AI 2.0 Edge Velocity Protection',
          expression: '(http.request.uri.path contains "/api/")',
          rate_limit: {
            characteristics: ['ip.src'],
            period: 60,
            requests_per_period: settings.rpsThresholdPerIp * 60,
            mitigation_timeout: settings.autoBlockDurationMinutes * 60
          },
          enabled: true
        },
        {
          action: 'managed_challenge',
          description: 'DDoS Shield AI 2.0 Botnet & Headless Scraper Challenge',
          expression: '(http.user_agent contains "curl" or http.user_agent contains "python" or not http.user_agent)',
          enabled: true
        }
      ]
    }, null, 2);
  }

  /**
   * Generates Linux kernel iptables / nftables drop rules
   */
  public generateIptablesScript(): string {
    const blocked = shieldState.getBlockedIps();
    return `#!/usr/bin/env bash
# ==============================================================================
# DDoS Shield AI 2.0 - Kernel-Level IP Dropping Script (iptables / nftables)
# Generated at: ${new Date().toISOString()}
# Run as root: sudo bash ddos_shield_iptables.sh
# ==============================================================================

set -euo pipefail

echo "[*] Initializing DDoS Shield AI iptables chain..."
iptables -N DDOS_SHIELD 2>/dev/null || iptables -F DDOS_SHIELD

# Prevent SYN floods (SYN Cookies & Rate Limiting)
iptables -A DDOS_SHIELD -p tcp --syn -m limit --limit 100/s --limit-burst 200 -j ACCEPT
iptables -A DDOS_SHIELD -p tcp --syn -j DROP

# Drop invalid packets
iptables -A DDOS_SHIELD -m state --state INVALID -j DROP

# Drop quarantined abusive IP addresses
${blocked.map(b => `iptables -A DDOS_SHIELD -s ${b.ip} -j DROP # ${b.reason}`).join('\n')}

# Attach to INPUT chain if not already present
iptables -C INPUT -j DDOS_SHIELD 2>/dev/null || iptables -I INPUT 1 -j DDOS_SHIELD

echo "[+] DDoS Shield AI kernel rules active. Dropping ${blocked.length} malicious IPs at raw socket layer."
`;
  }
}

export const mitigationEngine = new MitigationEngine();
