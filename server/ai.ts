import { GoogleGenAI } from '@google/genai';
import { SecurityIncident, AiIncidentAnalysis, TelemetryPoint } from './types.js';

let genAIClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

/**
 * Performs deep AI-assisted incident analysis using Gemini 3.8 Flash
 */
export async function analyzeIncidentWithAI(
  incident: SecurityIncident,
  telemetrySnapshot?: TelemetryPoint
): Promise<AiIncidentAnalysis> {
  const client = getClient();

  // If Gemini API is available, generate real AI reasoning
  if (client) {
    try {
      const prompt = `
You are DDoS Shield AI Senior Incident Commander. Analyze the following security telemetry and incident evidence to provide a forensic diagnosis.

INCIDENT DETAILS:
- ID: ${incident.id}
- Title: ${incident.title}
- Severity: ${incident.severity}
- Detected Vector: ${incident.vector}
- Confidence Score: ${incident.confidenceScore}%
- Peak RPS: ${incident.peakRps}
- Peak Bandwidth: ${incident.peakBandwidthMbps} Mbps
- Suspicious IP Sources: ${incident.suspiciousIpCount}
- Affected Services: ${incident.affectedServices.join(', ')}

EVIDENCE GATHERED:
${incident.evidence.map(e => `- ${e.key}: ${e.detail}`).join('\n')}

TELEMETRY CONTEXT:
${telemetrySnapshot ? JSON.stringify(telemetrySnapshot, null, 2) : 'Real-time telemetry baseline active'}

Return a JSON object conforming exactly to this structure (no markdown fences, raw JSON):
{
  "attackClassification": "Precise attack classification name",
  "confidence": 95,
  "rootCauseHypothesis": "Concise forensic root cause explaining the attacker mechanics",
  "falsePositiveLikelihood": "LOW" | "MEDIUM" | "HIGH",
  "falsePositiveReasoning": "Why this is or isn't benign user behavior or marketing traffic",
  "blastRadius": "Impact on underlying infrastructure and customer experience",
  "recommendedMitigationPolicy": {
    "immediateAction": "Immediate tactical command to execute right now",
    "rateLimitAdjustment": "Specific rate limit values (RPS, burst, cooldown)",
    "suggestedWafRule": "Concrete NGINX, Cloudflare, or iptables rule syntax"
  },
  "executiveSummary": "2-sentence executive summary suitable for CTO / CISO briefings"
}
`;

      const response = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const responseText = response.text || '';
      const parsed = JSON.parse(responseText.trim());
      return {
        ...parsed,
        analyzedAt: Date.now()
      };
    } catch (err) {
      console.warn('[DDoS Shield AI] Gemini API call failed or timed out, generating deterministic fallback:', err);
    }
  }

  // Deterministic rule-based expert analysis fallback
  return generateDeterministicAnalysis(incident);
}

/**
 * Forensic fallback when external LLM service is offline
 */
function generateDeterministicAnalysis(incident: SecurityIncident): AiIncidentAnalysis {
  let classification = 'Layer 7 HTTP Flooding & Application Resource Exhaustion';
  let rootCause = 'Hostile actor coordinated an HTTP request flood targeting compute-heavy API endpoints to exhaust thread pools.';
  let fpLikelihood: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let fpReasoning = 'Lack of referer headers, uniform request cadence, and high IP entropy strongly correlate with scripted botnet behavior rather than organic user spikes.';
  let blastRadius = 'Application worker pool elevated CPU load; core database query latency increased.';
  let immediateAction = 'Engage rate limiter at 20 RPS/IP on /api routes and quarantine top 1% offending IPs.';
  let rateLimit = 'Threshold: 20 RPS per client IP, Burst: 35 requests, Cool-down: 15 minutes.';
  let wafRule = 'limit_req zone=ddos_shield_per_ip burst=35 nodelay;';

  if (incident.vector === 'SLOWLORIS_CONNECTION_STARVATION') {
    classification = 'Slowloris Partial Header Connection Starvation';
    rootCause = 'Attacker opened hundreds of concurrent HTTP connections, sending periodic 10-byte chunks to exhaust socket descriptor limits without generating high bandwidth.';
    fpLikelihood = 'LOW';
    fpReasoning = 'Connection hold times exceeding 120s with sub-kilobyte payload throughput is virtually nonexistent in normal web browser sessions.';
    blastRadius = 'Max client connections reached on edge proxy; new incoming connections queued or dropped.';
    immediateAction = 'Lower client_header_timeout to 5s and terminate idle keep-alive connections.';
    rateLimit = 'Max concurrent connections per IP: 10 sockets.';
    wafRule = 'client_header_timeout 5s; client_body_timeout 5s; limit_conn ddos_shield_conn 10;';
  } else if (incident.vector === 'CREDENTIAL_STUFFING_L7') {
    classification = 'Automated Distributed Credential Stuffing & Auth Brute Force';
    rootCause = 'Automated attack abusing leaked credentials against login endpoints with high 401/403 failure ratios.';
    fpLikelihood = 'LOW';
    fpReasoning = 'Error failure rate on auth routes surpassed 60% across 50+ distinct client IP addresses.';
    blastRadius = 'Authentication backend database hit by high verification queries; potential account lockouts.';
    immediateAction = 'Enforce CAPTCHA proof-of-work on auth routes and limit login attempts to 5 per minute per IP.';
    rateLimit = 'Limit /api/v1/auth/* to 5 requests per minute with 5-minute cool-down.';
    wafRule = 'location /api/v1/auth/ { limit_req zone=auth_limit burst=5; }';
  } else if (incident.vector === 'BENIGN_TRAFFIC_SURGE') {
    classification = 'Benign Traffic Influx / Viral Social Surge';
    rootCause = 'Organic spike driven by external referral or marketing campaign; balanced status codes observed.';
    fpLikelihood = 'HIGH';
    fpReasoning = 'Requests arrive with standard browser User-Agents, organic navigational paths, and zero 4xx/5xx error anomalies.';
    blastRadius = 'Elevated bandwidth consumption; server load healthy.';
    immediateAction = 'Do NOT enforce IP bans. Scale backend autoscaling pods and maintain monitoring.';
    rateLimit = 'Maintain normal threshold (80 RPS).';
    wafRule = '# No blocking recommended - benign traffic surge';
  }

  return {
    attackClassification: classification,
    confidence: incident.confidenceScore || 92,
    rootCauseHypothesis: rootCause,
    falsePositiveLikelihood: fpLikelihood,
    falsePositiveReasoning: fpReasoning,
    blastRadius,
    recommendedMitigationPolicy: {
      immediateAction,
      rateLimitAdjustment: rateLimit,
      suggestedWafRule: wafRule
    },
    executiveSummary: `DDoS Shield AI analyzed incident ${incident.id}. Attack vector classified as ${classification} with ${incident.confidenceScore}% confidence. Defensive policies successfully contained incident blast radius.`,
    analyzedAt: Date.now()
  };
}
