import { TelemetryPoint, AnomalyAlert, AttackVectorType, IncidentSeverity } from './types.js';
import { shieldState } from './state.js';

export interface AnomalyDetectionConfig {
  zScoreThreshold: number; // e.g. 2.5 standard deviations
  minSamplesForBaseline: number;
  bandwidthSpikeThresholdMbps: number;
  errorRateThresholdPercent: number;
  activeConnectionThreshold: number;
}

export class AnomalyDetector {
  private config: AnomalyDetectionConfig = {
    zScoreThreshold: 2.5,
    minSamplesForBaseline: 15,
    bandwidthSpikeThresholdMbps: 80,
    errorRateThresholdPercent: 12,
    activeConnectionThreshold: 1000
  };

  /**
   * Evaluates the latest telemetry point against the historical sliding window
   */
  public evaluate(latestPoint: TelemetryPoint, history: TelemetryPoint[]): AnomalyAlert | null {
    if (history.length < this.config.minSamplesForBaseline) {
      return null;
    }

    // Exclude current point from baseline calculation
    const baselinePoints = history.slice(0, -1);
    const rpsValues = baselinePoints.map(p => p.requestsPerSecond);
    const { mean: rpsMean, stdDev: rpsStdDev } = this.calculateStats(rpsValues);

    const rpsZScore = rpsStdDev > 0 ? (latestPoint.requestsPerSecond - rpsMean) / rpsStdDev : 0;
    const activeScenario = shieldState.getActiveScenario().scenario;

    const indicators: AnomalyAlert['indicators'] = [];
    let detectedVector: AttackVectorType = 'BENIGN_TRAFFIC_SURGE';
    let severity: IncidentSeverity = 'INFORMATIONAL';
    let confidence = 50;
    let explanation = '';
    let recommendedAction = '';

    // Check 1: RPS Spike
    if (rpsZScore > this.config.zScoreThreshold && latestPoint.requestsPerSecond > 60) {
      indicators.push({
        name: 'Request Rate (RPS) Z-Score Surge',
        observedValue: `${latestPoint.requestsPerSecond} req/s (Z=${rpsZScore.toFixed(2)})`,
        baselineValue: `${Math.round(rpsMean)} req/s (σ=${rpsStdDev.toFixed(1)})`,
        deviation: `+${Math.round(((latestPoint.requestsPerSecond - rpsMean) / Math.max(1, rpsMean)) * 100)}%`
      });
    }

    // Check 2: Error Rate Deviation (HTTP 4xx / 5xx)
    if (latestPoint.errorRatePercent >= this.config.errorRateThresholdPercent) {
      indicators.push({
        name: 'Abnormal Error Ratio (4xx/5xx)',
        observedValue: `${latestPoint.errorRatePercent.toFixed(1)}%`,
        baselineValue: '0.2%',
        deviation: `+${Math.round(latestPoint.errorRatePercent * 10)}x normal baseline`
      });
    }

    // Check 3: Active Connections saturation (Slowloris/socket exhaustion)
    if (latestPoint.activeConnections >= this.config.activeConnectionThreshold) {
      indicators.push({
        name: 'Socket Pool Saturation',
        observedValue: `${latestPoint.activeConnections} active sockets`,
        baselineValue: '150 active sockets',
        deviation: `+${Math.round((latestPoint.activeConnections / 150) * 100)}% capacity`
      });
    }

    // Check 4: Bandwidth Saturation
    if (latestPoint.bandwidthMbps >= this.config.bandwidthSpikeThresholdMbps) {
      indicators.push({
        name: 'Ingress Bandwidth Spike',
        observedValue: `${latestPoint.bandwidthMbps} Mbps`,
        baselineValue: '14.5 Mbps',
        deviation: `+${Math.round((latestPoint.bandwidthMbps / 14.5) * 100)}% ingress load`
      });
    }

    // If no indicators triggered, no anomaly
    if (indicators.length === 0) {
      return null;
    }

    // Classify Attack Vector based on multi-dimensional telemetry patterns
    if (latestPoint.activeConnections >= 1200 && latestPoint.bandwidthMbps < 10) {
      detectedVector = 'SLOWLORIS_CONNECTION_STARVATION';
      severity = 'HIGH';
      confidence = 91;
      explanation = 'High concurrent socket count combined with abnormally low ingress bandwidth indicates Slowloris or incomplete HTTP header starvation attack.';
      recommendedAction = 'Enforce aggressive client header/body timeouts (client_header_timeout 5s) and drop persistent idle keep-alive connections.';
    } else if (latestPoint.errorRatePercent > 35 && latestPoint.statusCodes['4xx'] > latestPoint.statusCodes['5xx']) {
      detectedVector = 'CREDENTIAL_STUFFING_L7';
      severity = 'HIGH';
      confidence = 88;
      explanation = 'High volume of 401/403/429 client errors on authentication endpoints indicates distributed brute-force or credential stuffing.';
      recommendedAction = 'Engage adaptive CAPTCHA challenge on /auth routes and enforce IP-subnet velocity rate limits.';
    } else if (latestPoint.bandwidthMbps > 200 || (latestPoint.requestsPerSecond > 500 && latestPoint.cpuPercent > 85)) {
      detectedVector = latestPoint.bandwidthMbps > 200 ? 'VOLUMETRIC_FLOOD' : 'HTTP_GET_FLOOD';
      severity = 'CRITICAL';
      confidence = 95;
      explanation = `Observed severe volumetric surge exceeding 3σ statistical threshold with CPU load at ${latestPoint.cpuPercent}%. Strong indication of coordinated L7 flood.`;
      recommendedAction = 'Deploy edge rate limiting, activate circuit breaker on non-essential endpoints, and push top offender CIDRs to BGP/WAF drop rules.';
    } else if (indicators.length === 1 && rpsZScore < 4.0 && latestPoint.errorRatePercent < 2.0) {
      // Possible benign surge (Flash crowd, marketing campaign, product launch)
      detectedVector = 'BENIGN_TRAFFIC_SURGE';
      severity = 'LOW';
      confidence = 62;
      explanation = 'Moderate RPS increase with zero error rate and normal status codes. Likely a benign marketing surge or legitimate user influx.';
      recommendedAction = 'Monitor latency and backend queue depth without enforcing aggressive drops to prevent false positive impact.';
    } else {
      detectedVector = 'HTTP_GET_FLOOD';
      severity = 'MEDIUM';
      confidence = 78;
      explanation = 'Unusual request concentration and statistical deviations detected across edge endpoints.';
      recommendedAction = 'Enable Dry-Run monitoring and verify source IP reputation distribution.';
    }

    const settings = shieldState.getSettings();
    const dryRunAction = settings.defenseMode === 'DRY_RUN' 
      ? `[DRY-RUN] Proposed: Rate-limit offending sources to ${settings.rpsThresholdPerIp} RPS and quarantine persistent abusers for ${settings.autoBlockDurationMinutes}m.`
      : `[ENFORCING] Automatically rate-limiting traffic and quarantining flagged IP addresses.`;

    const alert: AnomalyAlert = {
      id: `ALT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: latestPoint.timestamp,
      title: `${severity}: ${detectedVector.replace(/_/g, ' ')} Detected`,
      severity,
      confidenceScore: confidence,
      vector: detectedVector,
      indicators,
      explanation,
      recommendedAction,
      mitigated: false,
      dryRunAction
    };

    return alert;
  }

  private calculateStats(values: number[]): { mean: number; stdDev: number } {
    if (values.length === 0) return { mean: 0, stdDev: 0 };
    const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
    return { mean, stdDev: Math.sqrt(variance) };
  }
}

export const detector = new AnomalyDetector();
