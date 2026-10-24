import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Shield,
  Zap,
  Cpu,
  Radio,
  Server,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
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
  ActiveTab,
  AiIncidentAnalysis,
  DefenseMode,
  IncidentStatus
} from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MetricTile } from './components/MetricTile';
import { LiveTelemetryChart } from './components/LiveTelemetryChart';
import { LatencyHistogram } from './components/LatencyHistogram';
import { ThreatRadar } from './components/ThreatRadar';
import { ScenarioSimulator } from './components/ScenarioSimulator';
import { AnomalyAlertsPanel } from './components/AnomalyAlertsPanel';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { MitigationControls } from './components/MitigationControls';
import { TrafficAnalytics } from './components/TrafficAnalytics';
import { IncidentResponseCenter } from './components/IncidentResponseCenter';
import { AuditLogViewer } from './components/AuditLogViewer';
import { WafRuleExporter } from './components/WafRuleExporter';
import { IncidentReportModal } from './components/IncidentReportModal';
import { NotificationToast } from './components/NotificationToast';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Core telemetry state
  const [latestTelemetry, setLatestTelemetry] = useState<TelemetryPoint>({
    timestamp: Date.now(),
    requestsPerSecond: 28,
    bandwidthMbps: 14.2,
    cpuPercent: 22,
    memoryPercent: 44,
    activeConnections: 145,
    avgLatencyMs: 24,
    p95LatencyMs: 42,
    p99LatencyMs: 68,
    errorRatePercent: 0.15,
    statusCodes: { '2xx': 27, '3xx': 1, '4xx': 0, '5xx': 0 },
    anomalyScore: 4
  });
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryPoint[]>([]);

  // Incidents, alerts, and mitigations
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [mitigationSettings, setMitigationSettings] = useState<MitigationSettings>({
    defenseMode: 'DRY_RUN',
    rpsThresholdPerIp: 80,
    burstCapacity: 120,
    autoBlockDurationMinutes: 15,
    enableAutoBlock: true,
    circuitBreakerEnabled: true,
    circuitBreakerTripped: false,
    circuitBreakerCpuThreshold: 85,
    circuitBreakerRamThreshold: 90,
    adminSafeIps: ['127.0.0.1', '::1', '192.168.1.0/24'],
    privacyMaskIps: false
  });
  const [blockedIps, setBlockedIps] = useState<BlockedIpEntry[]>([]);
  const [allowedIps, setAllowedIps] = useState<AllowedIpEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [topUris, setTopUris] = useState<TopTargetUri[]>([]);
  const [geoDistribution, setGeoDistribution] = useState<GeoDistribution[]>([]);
  const [activeScenario, setActiveScenario] = useState<string>('NORMAL');

  // AI Modal & Forensic states
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiIncidentAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiModalTitle, setAiModalTitle] = useState('');
  const [selectedIncidentForAi, setSelectedIncidentForAi] = useState<SecurityIncident | null>(null);

  // Formal Report Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportIncident, setReportIncident] = useState<SecurityIncident | null>(null);

  // Real-time toast alert state
  const [toastAlert, setToastAlert] = useState<AnomalyAlert | null>(null);

  // Fetch initial telemetry and history
  const loadInitialData = useCallback(async () => {
    try {
      const [hist, alts, incs, mits, logs, uris, geos, sc] = await Promise.all([
        api.getTelemetryHistory(60),
        api.getAlerts(),
        api.getIncidents(),
        api.getMitigations(),
        api.getAuditLogs(100),
        api.getTopUris(),
        api.getGeoDistribution(),
        api.getActiveScenario()
      ]);

      if (hist && hist.length > 0) {
        setTelemetryHistory(hist);
        setLatestTelemetry(hist[hist.length - 1]);
      }
      setAlerts(alts);
      setIncidents(incs);
      setMitigationSettings(mits.settings);
      setBlockedIps(mits.blockedIps);
      setAllowedIps(mits.allowedIps);
      setAuditLogs(logs);
      setTopUris(uris);
      setGeoDistribution(geos);
      setActiveScenario(sc.scenario);
    } catch (err) {
      console.warn('Initial telemetry load warning:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // Subscribe to real-time SSE stream
    const unsubscribe = api.subscribeTelemetry(
      (newPoint) => {
        setLatestTelemetry(newPoint);
        setTelemetryHistory((prev) => {
          const updated = [...prev, newPoint];
          return updated.slice(-60); // keep last 60 seconds
        });
      },
      (newAlert) => {
        setAlerts((prev) => [newAlert, ...prev].slice(0, 50));
        if (newAlert.severity === 'CRITICAL' || newAlert.severity === 'HIGH') {
          setToastAlert(newAlert);
        }
        // Refresh incidents and audit logs when new anomaly arises
        api.getIncidents().then(setIncidents).catch(() => {});
        api.getAuditLogs().then(setAuditLogs).catch(() => {});
      }
    );

    return () => {
      unsubscribe();
    };
  }, [loadInitialData]);

  // Periodic poll for non-telemetry data (every 5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      api.getMitigations().then((mits) => {
        setMitigationSettings(mits.settings);
        setBlockedIps(mits.blockedIps);
        setAllowedIps(mits.allowedIps);
      }).catch(() => {});

      api.getTopUris().then(setTopUris).catch(() => {});
      api.getGeoDistribution().then(setGeoDistribution).catch(() => {});
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  // Handlers
  const handleScenarioChange = async (scenario: string) => {
    setActiveScenario(scenario);
    await api.setScenario(scenario, 'OPERATOR');
    const [alts, incs, logs, uris, geos] = await Promise.all([
      api.getAlerts(),
      api.getIncidents(),
      api.getAuditLogs(),
      api.getTopUris(),
      api.getGeoDistribution()
    ]);
    setAlerts(alts);
    setIncidents(incs);
    setAuditLogs(logs);
    setTopUris(uris);
    setGeoDistribution(geos);
  };

  const handleUpdateMitigationSettings = async (partial: Partial<MitigationSettings>) => {
    const updated = await api.updateSettings(partial);
    setMitigationSettings(updated);
    const logs = await api.getAuditLogs();
    setAuditLogs(logs);
  };

  const handleBlockIp = async (params: { ip: string; reason: string; durationMinutes: number | null }) => {
    await api.blockIp(params);
    const mits = await api.getMitigations();
    setBlockedIps(mits.blockedIps);
    const logs = await api.getAuditLogs();
    setAuditLogs(logs);
  };

  const handleUnblockIp = async (ip: string) => {
    await api.unblockIp(ip);
    const mits = await api.getMitigations();
    setBlockedIps(mits.blockedIps);
    const logs = await api.getAuditLogs();
    setAuditLogs(logs);
  };

  const handleAddAllowedIp = async (cidr: string, desc: string) => {
    await api.addAllowedIp(cidr, desc);
    const mits = await api.getMitigations();
    setAllowedIps(mits.allowedIps);
    const logs = await api.getAuditLogs();
    setAuditLogs(logs);
  };

  const handleRemoveAllowedIp = async (cidr: string) => {
    await api.removeAllowedIp(cidr);
    const mits = await api.getMitigations();
    setAllowedIps(mits.allowedIps);
    const logs = await api.getAuditLogs();
    setAuditLogs(logs);
  };

  const handleToggleCircuitBreaker = async (trip: boolean) => {
    await api.toggleCircuitBreaker(trip);
    const mits = await api.getMitigations();
    setMitigationSettings(mits.settings);
    const logs = await api.getAuditLogs();
    setAuditLogs(logs);
  };

  const handleUpdateIncidentStatus = async (id: string, status: IncidentStatus) => {
    const updated = await api.updateIncidentStatus(id, status);
    setIncidents((prev) => prev.map((inc) => (inc.id === id ? updated : inc)));
    const logs = await api.getAuditLogs();
    setAuditLogs(logs);
  };

  const handleAddIncidentNote = async (id: string, text: string) => {
    const updated = await api.addIncidentNote(id, text);
    setIncidents((prev) => prev.map((inc) => (inc.id === id ? updated : inc)));
  };

  // Trigger Gemini AI Incident Diagnosis
  const handleTriggerAiIncident = async (incident: SecurityIncident) => {
    setSelectedIncidentForAi(incident);
    setAiModalTitle(incident.title);
    setIsAiModalOpen(true);
    setAiLoading(true);

    try {
      const res = await api.triggerAiAnalysis(incident.id);
      setAiAnalysis(res);
      const updatedIncidents = await api.getIncidents();
      setIncidents(updatedIncidents);
      const logs = await api.getAuditLogs();
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('AI diagnosis error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleTriggerAiFromAlert = async (alert: AnomalyAlert) => {
    // Check if an incident exists for this alert or find best match
    const matchingIncident = incidents.find((i) => i.vector === alert.vector) || incidents[0];
    if (matchingIncident) {
      handleTriggerAiIncident(matchingIncident);
    }
  };

  const handleApplyAiMitigation = async (policy: AiIncidentAnalysis['recommendedMitigationPolicy']) => {
    // Switch to ENFORCING mode and apply tightened thresholds
    await handleUpdateMitigationSettings({
      defenseMode: 'ENFORCING',
      rpsThresholdPerIp: 30,
      burstCapacity: 45
    });
    if (selectedIncidentForAi) {
      await handleUpdateIncidentStatus(selectedIncidentForAi.id, 'MITIGATING');
    }
  };

  const handleOpenReportModal = (incident: SecurityIncident) => {
    setReportIncident(incident);
    setIsReportModalOpen(true);
  };

  const openIncidentsCount = incidents.filter(
    (i) => i.status === 'OPEN' || i.status === 'INVESTIGATING' || i.status === 'MITIGATING'
  ).length;

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans transition-colors`}>
      {/* Top Header */}
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        defenseMode={mitigationSettings.defenseMode}
        circuitBreakerTripped={mitigationSettings.circuitBreakerTripped}
        activeScenario={activeScenario}
        onScenarioChange={handleScenarioChange}
        unreadAlertsCount={alerts.length}
        onOpenAlerts={() => setActiveTab('detection')}
      />

      {/* Main Workspace: Sidebar + Center Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openIncidentsCount={openIncidentsCount}
          activeAlertsCount={alerts.length}
        />

        {/* Content Pane */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* TAB 1: COMMAND CENTER (OVERVIEW) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Server Health Status Banner */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                  <div>
                    <span className="font-bold text-slate-100 text-sm">Autonomous Edge Shield Operational</span>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                      <span>Defense Mode: <strong className="text-cyan-400">{mitigationSettings.defenseMode}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Token Bucket: {mitigationSettings.rpsThresholdPerIp} RPS</span>
                      <span aria-hidden="true">·</span>
                      <span>Active Quarantined IPs: <strong className="text-rose-400">{blockedIps.length}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                  <div>
                    Uptime: <strong className="text-slate-200">99.99%</strong>
                  </div>
                  <div>
                    Circuit Breaker: <strong className={mitigationSettings.circuitBreakerTripped ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {mitigationSettings.circuitBreakerTripped ? 'TRIPPED' : 'STANDBY'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 6 Key Telemetry Tiles */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricTile
                  label="Incoming RPS"
                  value={latestTelemetry.requestsPerSecond}
                  unit="req/s"
                  status={latestTelemetry.requestsPerSecond > 200 ? 'CRITICAL' : latestTelemetry.requestsPerSecond > 80 ? 'WARNING' : 'NORMAL'}
                  delta={`${latestTelemetry.requestsPerSecond > 50 ? '+140%' : '±0%'}`}
                  icon={<Activity className="w-4 h-4" />}
                />
                <MetricTile
                  label="Bandwidth"
                  value={latestTelemetry.bandwidthMbps}
                  unit="Mbps"
                  status={latestTelemetry.bandwidthMbps > 100 ? 'CRITICAL' : latestTelemetry.bandwidthMbps > 50 ? 'WARNING' : 'NORMAL'}
                  delta="Ingress Pipe"
                  icon={<Radio className="w-4 h-4" />}
                />
                <MetricTile
                  label="Active Sockets"
                  value={latestTelemetry.activeConnections}
                  unit="conns"
                  status={latestTelemetry.activeConnections > 1200 ? 'CRITICAL' : latestTelemetry.activeConnections > 500 ? 'WARNING' : 'NORMAL'}
                  delta="Socket Pool"
                  icon={<Server className="w-4 h-4" />}
                />
                <MetricTile
                  label="Latency (p99)"
                  value={latestTelemetry.p99LatencyMs}
                  unit="ms"
                  status={latestTelemetry.p99LatencyMs > 500 ? 'CRITICAL' : latestTelemetry.p99LatencyMs > 150 ? 'WARNING' : 'NORMAL'}
                  delta={`p50: ${latestTelemetry.avgLatencyMs}ms`}
                  icon={<Clock className="w-4 h-4" />}
                />
                <MetricTile
                  label="Error Rate"
                  value={latestTelemetry.errorRatePercent}
                  unit="%"
                  status={latestTelemetry.errorRatePercent > 10 ? 'CRITICAL' : latestTelemetry.errorRatePercent > 2 ? 'WARNING' : 'NORMAL'}
                  delta="4xx / 5xx Ratio"
                  icon={<AlertTriangle className="w-4 h-4" />}
                />
                <MetricTile
                  label="Server CPU"
                  value={latestTelemetry.cpuPercent}
                  unit="%"
                  status={latestTelemetry.cpuPercent > 85 ? 'CRITICAL' : latestTelemetry.cpuPercent > 65 ? 'WARNING' : 'NORMAL'}
                  delta={`RAM: ${latestTelemetry.memoryPercent}%`}
                  icon={<Cpu className="w-4 h-4" />}
                />
              </div>

              {/* Main Visualizer Split: Left Chart, Right Gauges */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left (8 Cols): Real-time SVG Chart + Scenario Simulator */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                      <div>
                        <h3 className="text-sm font-bold font-mono text-slate-100 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-cyan-400" /> Real-Time Ingress Velocity (RPS & Thresholds)
                        </h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          Sub-second Server-Sent Events (SSE) telemetry pipeline. 1-second resolution.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>LIVE STREAM</span>
                      </span>
                    </div>

                    <LiveTelemetryChart
                      data={telemetryHistory}
                      rpsThreshold={mitigationSettings.rpsThresholdPerIp}
                    />
                  </div>

                  {/* Scenario Simulator */}
                  <ScenarioSimulator
                    activeScenario={activeScenario}
                    onSelectScenario={handleScenarioChange}
                    defenseMode={mitigationSettings.defenseMode}
                  />
                </div>

                {/* Right (4 Cols): Threat Radar & Latency Distribution */}
                <div className="lg:col-span-4 space-y-6">
                  <ThreatRadar latest={latestTelemetry} scenario={activeScenario} />
                  <LatencyHistogram latest={latestTelemetry} />
                </div>
              </div>

              {/* Recent Anomaly Alerts Preview */}
              <AnomalyAlertsPanel alerts={alerts.slice(0, 3)} onAnalyzeAi={handleTriggerAiFromAlert} />
            </div>
          )}

          {/* TAB 2: AI ANOMALY DETECTION ENGINE */}
          {activeTab === 'detection' && (
            <div className="space-y-6">
              <AnomalyAlertsPanel alerts={alerts} onAnalyzeAi={handleTriggerAiFromAlert} />
              <ScenarioSimulator
                activeScenario={activeScenario}
                onSelectScenario={handleScenarioChange}
                defenseMode={mitigationSettings.defenseMode}
              />
            </div>
          )}

          {/* TAB 3: DEFENSIVE POLICIES & QUARANTINE */}
          {activeTab === 'mitigation' && (
            <MitigationControls
              settings={mitigationSettings}
              blockedIps={blockedIps}
              allowedIps={allowedIps}
              onUpdateSettings={handleUpdateMitigationSettings}
              onBlockIp={handleBlockIp}
              onUnblockIp={handleUnblockIp}
              onAddAllowedIp={handleAddAllowedIp}
              onRemoveAllowedIp={handleRemoveAllowedIp}
              onToggleCircuitBreaker={handleToggleCircuitBreaker}
            />
          )}

          {/* TAB 4: TRAFFIC ANALYTICS & GEOLOCATION */}
          {activeTab === 'traffic' && (
            <TrafficAnalytics
              topUris={topUris}
              geoDistribution={geoDistribution}
              privacyMask={mitigationSettings.privacyMaskIps}
              onTogglePrivacy={(val) => handleUpdateMitigationSettings({ privacyMaskIps: val })}
            />
          )}

          {/* TAB 5: INCIDENT RESPONSE CENTER */}
          {activeTab === 'incidents' && (
            <IncidentResponseCenter
              incidents={incidents}
              onUpdateStatus={handleUpdateIncidentStatus}
              onAddNote={handleAddIncidentNote}
              onTriggerAi={handleTriggerAiIncident}
              onOpenReport={handleOpenReportModal}
            />
          )}

          {/* TAB 6: AUDIT LOGS */}
          {activeTab === 'audit' && <AuditLogViewer logs={auditLogs} />}

          {/* TAB 7: WAF & REVERSE PROXY RULES */}
          {activeTab === 'waf' && <WafRuleExporter />}
        </main>
      </div>

      {/* AI Forensic Reasoning Modal */}
      <AiAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        analysis={aiAnalysis}
        loading={aiLoading}
        incidentTitle={aiModalTitle}
        onApplyMitigation={handleApplyAiMitigation}
      />

      {/* Printable Executive Post-Mortem Report Modal */}
      <IncidentReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        incident={reportIncident}
      />

      {/* Real-time Toast Notifications */}
      <NotificationToast
        alert={toastAlert}
        onClose={() => setToastAlert(null)}
        onView={() => {
          setActiveTab('detection');
          setToastAlert(null);
        }}
      />
    </div>
  );
}
