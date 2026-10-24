import { Router, Request, Response } from 'express';
import { shieldState, SimulationScenario } from './state.js';
import { detector } from './detector.js';
import { mitigationEngine } from './mitigation.js';
import { analyzeIncidentWithAI } from './ai.js';
import { DefenseMode, IncidentStatus } from './types.js';

export const apiRouter = Router();

// Middleware: Evaluate incoming traffic against active defensive shield policies
apiRouter.use((req: Request, res: Response, next) => {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '127.0.0.1';
  const contentLength = Number(req.headers['content-length'] || 0);

  // Skip rate limiting for the internal telemetry streams to prevent dashboard disconnects
  if (req.path.startsWith('/telemetry') || req.path.startsWith('/health')) {
    return next();
  }

  const evaluation = mitigationEngine.evaluateRequest(clientIp, req.path, req.method, contentLength);
  if (!evaluation.allowed) {
    res.setHeader('X-Shield-Action', 'Blocked');
    res.setHeader('X-Shield-Reason', evaluation.reason || 'Blocked');
    return res.status(evaluation.status).json({
      error: evaluation.reason,
      status: evaluation.status,
      shield: 'DDoS Shield AI 2.0',
      timestamp: Date.now()
    });
  }

  res.setHeader('X-Shield-Status', evaluation.isDryRun ? 'Dry-Run-Allowed' : 'Protected');
  res.setHeader('X-Shield-Remaining-Tokens', evaluation.remainingTokens.toString());
  next();
});

// 1. Health & Availability Status
apiRouter.get('/health', (req: Request, res: Response) => {
  const latest = shieldState.getLatestTelemetry();
  const settings = shieldState.getSettings();
  res.json({
    status: 'ONLINE',
    version: '2.0.0',
    defenseMode: settings.defenseMode,
    circuitBreaker: {
      enabled: settings.circuitBreakerEnabled,
      tripped: settings.circuitBreakerTripped
    },
    systemMetrics: {
      cpuPercent: latest.cpuPercent,
      memoryPercent: latest.memoryPercent,
      activeConnections: latest.activeConnections,
      uptimeSeconds: Math.floor(process.uptime())
    },
    timestamp: Date.now()
  });
});

// 2. Real-time Telemetry Snapshot
apiRouter.get('/telemetry/live', (req: Request, res: Response) => {
  const latest = shieldState.getLatestTelemetry();
  res.json(latest);
});

// 3. Sliding Window Telemetry History
apiRouter.get('/telemetry/history', (req: Request, res: Response) => {
  const count = Number(req.query.count) || 60;
  const history = shieldState.getTelemetryHistory(count);
  res.json({
    count: history.length,
    data: history
  });
});

// 4. Server-Sent Events (SSE) Stream
apiRouter.get('/telemetry/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send immediate initial state
  const initialPoint = shieldState.getLatestTelemetry();
  res.write(`data: ${JSON.stringify({ type: 'TELEMETRY_TICK', data: initialPoint })}\n\n`);

  const intervalId = setInterval(() => {
    try {
      const nextPoint = shieldState.generateNextTelemetryPoint();
      const history = shieldState.getTelemetryHistory(30);
      const alert = detector.evaluate(nextPoint, history);

      if (alert) {
        shieldState.addAlert(alert);
        res.write(`data: ${JSON.stringify({ type: 'ANOMALY_ALERT', data: alert })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ type: 'TELEMETRY_TICK', data: nextPoint })}\n\n`);
    } catch (e) {
      // client disconnected
    }
  }, 1000);

  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});

// 5. Anomaly Alerts
apiRouter.get('/alerts', (req: Request, res: Response) => {
  res.json(shieldState.getAlerts());
});

// 6. Security Incidents
apiRouter.get('/incidents', (req: Request, res: Response) => {
  res.json(shieldState.getIncidents());
});

apiRouter.get('/incidents/:id', (req: Request, res: Response) => {
  const incident = shieldState.getIncidentById(req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  res.json(incident);
});

apiRouter.post('/incidents/:id/status', (req: Request, res: Response) => {
  const { status, operator } = req.body as { status: IncidentStatus; operator?: string };
  const updated = shieldState.updateIncidentStatus(req.params.id, status, operator || 'OPERATOR');
  if (!updated) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  res.json(updated);
});

apiRouter.post('/incidents/:id/notes', (req: Request, res: Response) => {
  const { text, author } = req.body as { text: string; author?: string };
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'Note text cannot be empty' });
  }
  const updated = shieldState.addIncidentNote(req.params.id, text.trim(), author || 'SecOps');
  if (!updated) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  res.json(updated);
});

// 7. Deep AI Forensic Analysis
apiRouter.post('/ai/analyze-incident/:id', async (req: Request, res: Response) => {
  const incident = shieldState.getIncidentById(req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  const latestTelemetry = shieldState.getLatestTelemetry();
  try {
    const analysis = await analyzeIncidentWithAI(incident, latestTelemetry);
    shieldState.attachAiAnalysis(incident.id, analysis);
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: 'AI analysis failed', details: err?.message });
  }
});

// 8. Mitigations Management
apiRouter.get('/mitigations', (req: Request, res: Response) => {
  res.json({
    settings: shieldState.getSettings(),
    blockedIps: shieldState.getBlockedIps(),
    allowedIps: shieldState.getAllowedIps()
  });
});

apiRouter.post('/mitigations/settings', (req: Request, res: Response) => {
  const { settings, operator } = req.body;
  const updated = shieldState.updateSettings(settings, operator || 'ADMIN');
  res.json(updated);
});

apiRouter.post('/mitigations/block', (req: Request, res: Response) => {
  const { ip, reason, durationMinutes, operator, countryCode, countryName, asn } = req.body;
  if (!ip) {
    return res.status(400).json({ error: 'Target IP is required' });
  }
  const result = shieldState.blockIp(
    ip,
    reason || 'Manual administrative quarantine',
    durationMinutes !== undefined ? durationMinutes : 15,
    operator || 'ADMIN',
    countryCode || 'XX',
    countryName || 'Unknown',
    asn || 'Unknown ASN'
  );
  if (!result.success) {
    return res.status(403).json(result);
  }
  res.json(result);
});

apiRouter.delete('/mitigations/block/:ip', (req: Request, res: Response) => {
  const ip = decodeURIComponent(req.params.ip);
  const operator = (req.query.operator as string) || 'ADMIN';
  const success = shieldState.unblockIp(ip, operator);
  res.json({ success, ip });
});

apiRouter.post('/mitigations/allow', (req: Request, res: Response) => {
  const { cidrOrIp, description, operator } = req.body;
  if (!cidrOrIp || !description) {
    return res.status(400).json({ error: 'cidrOrIp and description are required' });
  }
  const entry = shieldState.addAllowedIp(cidrOrIp, description, operator || 'ADMIN');
  res.json({ success: true, entry });
});

apiRouter.delete('/mitigations/allow', (req: Request, res: Response) => {
  const cidrOrIp = req.body.cidrOrIp || req.query.cidrOrIp;
  const operator = (req.query.operator as string) || 'ADMIN';
  if (!cidrOrIp) {
    return res.status(400).json({ error: 'cidrOrIp is required' });
  }
  const success = shieldState.removeAllowedIp(cidrOrIp as string, operator);
  if (!success) {
    return res.status(403).json({ error: 'Cannot remove this address (Protected Loopback or not found)' });
  }
  res.json({ success: true });
});

apiRouter.post('/mitigations/circuit-breaker', (req: Request, res: Response) => {
  const { trip, operator } = req.body;
  const current = shieldState.getSettings();
  const updated = shieldState.updateSettings({ circuitBreakerTripped: Boolean(trip) }, operator || 'ADMIN');
  shieldState.addAuditLog(
    'CIRCUIT_BREAKER_MANUAL_TOGGLE',
    operator || 'ADMIN',
    'CIRCUIT_BREAKER',
    trip ? 'WARNING' : 'SUCCESS',
    `Manual operator override: Circuit breaker ${trip ? 'TRIPPED (Load Shedding)' : 'RESET (Normal)'}`
  );
  res.json(updated);
});

// 9. Traffic Analysis Endpoints
apiRouter.get('/traffic/uris', (req: Request, res: Response) => {
  res.json(shieldState.getTopTargetUris());
});

apiRouter.get('/traffic/geo', (req: Request, res: Response) => {
  res.json(shieldState.getGeoDistribution());
});

// 10. Immutable Audit Logs
apiRouter.get('/audit-logs', (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 100;
  res.json(shieldState.getAuditLogs(limit));
});

// 11. Simulation Controls
apiRouter.post('/simulation/scenario', (req: Request, res: Response) => {
  const { scenario, operator } = req.body as { scenario: SimulationScenario; operator?: string };
  if (!['NORMAL', 'HTTP_GET_FLOOD', 'SLOWLORIS', 'CREDENTIAL_STUFFING', 'VOLUMETRIC_SPIKE'].includes(scenario)) {
    return res.status(400).json({ error: 'Invalid scenario name' });
  }
  shieldState.setScenario(scenario, operator || 'OPERATOR');
  res.json({ success: true, activeScenario: scenario });
});

apiRouter.get('/simulation/scenario', (req: Request, res: Response) => {
  res.json(shieldState.getActiveScenario());
});

// 12. WAF & Reverse Proxy Rule Exporter
apiRouter.get('/waf/export', (req: Request, res: Response) => {
  const type = (req.query.type as string) || 'nginx';
  if (type === 'nginx') {
    res.setHeader('Content-Type', 'text/plain');
    return res.send(mitigationEngine.generateNginxConfig());
  } else if (type === 'cloudflare') {
    res.setHeader('Content-Type', 'application/json');
    return res.send(mitigationEngine.generateCloudflareWafRules());
  } else if (type === 'iptables') {
    res.setHeader('Content-Type', 'text/plain');
    return res.send(mitigationEngine.generateIptablesScript());
  }
  res.status(400).json({ error: 'Unsupported format. Use type=nginx|cloudflare|iptables' });
});
