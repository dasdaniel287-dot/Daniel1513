import {
  TelemetryPoint,
  AnomalyAlert,
  SecurityIncident,
  MitigationSettings,
  BlockedIpEntry,
  AllowedIpEntry,
  AuditLogEntry,
  TopTargetUri,
  GeoDistribution,
  AiIncidentAnalysis
} from '../types';

export class ApiService {
  private baseUrl = '/api';

  public async getHealth(): Promise<any> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error('Failed to fetch health');
    return res.json();
  }

  public async getLatestTelemetry(): Promise<TelemetryPoint> {
    const res = await fetch(`${this.baseUrl}/telemetry/live`);
    if (!res.ok) throw new Error('Failed to fetch live telemetry');
    return res.json();
  }

  public async getTelemetryHistory(count = 60): Promise<TelemetryPoint[]> {
    const res = await fetch(`${this.baseUrl}/telemetry/history?count=${count}`);
    if (!res.ok) throw new Error('Failed to fetch telemetry history');
    const json = await res.json();
    return json.data;
  }

  public subscribeTelemetry(
    onTick: (point: TelemetryPoint) => void,
    onAlert: (alert: AnomalyAlert) => void
  ): () => void {
    const eventSource = new EventSource(`${this.baseUrl}/telemetry/stream`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'TELEMETRY_TICK') {
          onTick(payload.data);
        } else if (payload.type === 'ANOMALY_ALERT') {
          onAlert(payload.data);
        }
      } catch (err) {
        console.error('SSE JSON parse error:', err);
      }
    };

    eventSource.onerror = () => {
      // EventSource automatically retries connection
    };

    return () => {
      eventSource.close();
    };
  }

  public async getAlerts(): Promise<AnomalyAlert[]> {
    const res = await fetch(`${this.baseUrl}/alerts`);
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
  }

  public async getIncidents(): Promise<SecurityIncident[]> {
    const res = await fetch(`${this.baseUrl}/incidents`);
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return res.json();
  }

  public async updateIncidentStatus(id: string, status: SecurityIncident['status'], operator = 'OPERATOR'): Promise<SecurityIncident> {
    const res = await fetch(`${this.baseUrl}/incidents/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, operator })
    });
    if (!res.ok) throw new Error('Failed to update incident status');
    return res.json();
  }

  public async addIncidentNote(id: string, text: string, author = 'OPERATOR'): Promise<SecurityIncident> {
    const res = await fetch(`${this.baseUrl}/incidents/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, author })
    });
    if (!res.ok) throw new Error('Failed to add incident note');
    return res.json();
  }

  public async triggerAiAnalysis(id: string): Promise<AiIncidentAnalysis> {
    const res = await fetch(`${this.baseUrl}/ai/analyze-incident/${id}`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || 'AI analysis failed');
    }
    return res.json();
  }

  public async getMitigations(): Promise<{
    settings: MitigationSettings;
    blockedIps: BlockedIpEntry[];
    allowedIps: AllowedIpEntry[];
  }> {
    const res = await fetch(`${this.baseUrl}/mitigations`);
    if (!res.ok) throw new Error('Failed to fetch mitigations');
    return res.json();
  }

  public async updateSettings(settings: Partial<MitigationSettings>, operator = 'ADMIN'): Promise<MitigationSettings> {
    const res = await fetch(`${this.baseUrl}/mitigations/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, operator })
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  }

  public async blockIp(params: {
    ip: string;
    reason: string;
    durationMinutes: number | null;
    countryCode?: string;
    countryName?: string;
    asn?: string;
    operator?: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/mitigations/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || json.error || 'Failed to block IP');
    }
    return json;
  }

  public async unblockIp(ip: string, operator = 'ADMIN'): Promise<any> {
    const res = await fetch(`${this.baseUrl}/mitigations/block/${encodeURIComponent(ip)}?operator=${encodeURIComponent(operator)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to unblock IP');
    return res.json();
  }

  public async addAllowedIp(cidrOrIp: string, description: string, operator = 'ADMIN'): Promise<any> {
    const res = await fetch(`${this.baseUrl}/mitigations/allow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cidrOrIp, description, operator })
    });
    if (!res.ok) throw new Error('Failed to add allowed IP');
    return res.json();
  }

  public async removeAllowedIp(cidrOrIp: string, operator = 'ADMIN'): Promise<any> {
    const res = await fetch(`${this.baseUrl}/mitigations/allow`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cidrOrIp, operator })
    });
    if (!res.ok) throw new Error('Failed to remove allowed IP');
    return res.json();
  }

  public async toggleCircuitBreaker(trip: boolean, operator = 'ADMIN'): Promise<any> {
    const res = await fetch(`${this.baseUrl}/mitigations/circuit-breaker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip, operator })
    });
    if (!res.ok) throw new Error('Failed to toggle circuit breaker');
    return res.json();
  }

  public async getTopUris(): Promise<TopTargetUri[]> {
    const res = await fetch(`${this.baseUrl}/traffic/uris`);
    if (!res.ok) throw new Error('Failed to fetch top URIs');
    return res.json();
  }

  public async getGeoDistribution(): Promise<GeoDistribution[]> {
    const res = await fetch(`${this.baseUrl}/traffic/geo`);
    if (!res.ok) throw new Error('Failed to fetch geo distribution');
    return res.json();
  }

  public async getAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
    const res = await fetch(`${this.baseUrl}/audit-logs?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  }

  public async setScenario(scenario: string, operator = 'OPERATOR'): Promise<any> {
    const res = await fetch(`${this.baseUrl}/simulation/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, operator })
    });
    if (!res.ok) throw new Error('Failed to set scenario');
    return res.json();
  }

  public async getActiveScenario(): Promise<{ scenario: string; startedAt: number }> {
    const res = await fetch(`${this.baseUrl}/simulation/scenario`);
    if (!res.ok) throw new Error('Failed to get scenario');
    return res.json();
  }

  public async exportWaf(type: 'nginx' | 'cloudflare' | 'iptables'): Promise<string> {
    const res = await fetch(`${this.baseUrl}/waf/export?type=${type}`);
    if (!res.ok) throw new Error('Failed to export WAF rules');
    return res.text();
  }
}

export const api = new ApiService();
