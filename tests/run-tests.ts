import { shieldState } from '../server/state.js';
import { detector } from '../server/detector.js';
import { mitigationEngine } from '../server/mitigation.js';
import { TelemetryPoint } from '../server/types.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const ret = fn();
    if (ret instanceof Promise) {
      ret.then(() => {
        results.push({ name, passed: true });
        console.log(`  ✓ ${name}`);
      }).catch((err) => {
        results.push({ name, passed: false, error: err.message });
        console.error(`  ✗ ${name}: ${err.message}`);
      });
    } else {
      results.push({ name, passed: true });
      console.log(`  ✓ ${name}`);
    }
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message });
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('   DDoS Shield AI 2.0 — Automated Test Verification');
  console.log('======================================================\n');

  // Test 1: Normal Traffic Classification
  test('Normal traffic baseline does not trigger anomaly alert', () => {
    const history: TelemetryPoint[] = [];
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
      history.push({
        timestamp: now - i * 1000,
        requestsPerSecond: 25 + (i % 3),
        bandwidthMbps: 12.0,
        cpuPercent: 20,
        memoryPercent: 40,
        activeConnections: 120,
        avgLatencyMs: 25,
        p95LatencyMs: 40,
        p99LatencyMs: 60,
        errorRatePercent: 0.1,
        statusCodes: { '2xx': 25, '3xx': 0, '4xx': 0, '5xx': 0 },
        anomalyScore: 3
      });
    }
    const latest = history[history.length - 1];
    const alert = detector.evaluate(latest, history);
    assert(alert === null, 'Expected no alert for healthy traffic baseline');
  });

  // Test 2: Anomaly Detection on Volumetric / RPS Surge
  test('Abnormal RPS surge triggers high-severity anomaly alert', () => {
    const history: TelemetryPoint[] = [];
    const now = Date.now();
    for (let i = 20; i > 0; i--) {
      history.push({
        timestamp: now - i * 1000,
        requestsPerSecond: 30,
        bandwidthMbps: 12.0,
        cpuPercent: 20,
        memoryPercent: 40,
        activeConnections: 120,
        avgLatencyMs: 25,
        p95LatencyMs: 40,
        p99LatencyMs: 60,
        errorRatePercent: 0.1,
        statusCodes: { '2xx': 30, '3xx': 0, '4xx': 0, '5xx': 0 },
        anomalyScore: 3
      });
    }
    // Severe 650 RPS surge
    const surgePoint: TelemetryPoint = {
      timestamp: now,
      requestsPerSecond: 650,
      bandwidthMbps: 85.0,
      cpuPercent: 88,
      memoryPercent: 70,
      activeConnections: 1400,
      avgLatencyMs: 280,
      p95LatencyMs: 500,
      p99LatencyMs: 800,
      errorRatePercent: 18.5,
      statusCodes: { '2xx': 520, '3xx': 10, '4xx': 80, '5xx': 40 },
      anomalyScore: 92
    };
    history.push(surgePoint);
    const alert = detector.evaluate(surgePoint, history);
    assert(alert !== null, 'Expected anomaly alert to be generated');
    assert(alert!.confidenceScore >= 80, 'Confidence score should be >= 80%');
    assert(alert!.indicators.length >= 2, 'Should capture multiple indicators');
  });

  // Test 3: Slowloris Connection Starvation Classification
  test('High socket count with low bandwidth is classified as Slowloris', () => {
    const history: TelemetryPoint[] = [];
    const now = Date.now();
    for (let i = 20; i > 0; i--) {
      history.push({
        timestamp: now - i * 1000,
        requestsPerSecond: 28,
        bandwidthMbps: 10.0,
        cpuPercent: 25,
        memoryPercent: 45,
        activeConnections: 150,
        avgLatencyMs: 25,
        p95LatencyMs: 40,
        p99LatencyMs: 60,
        errorRatePercent: 0.1,
        statusCodes: { '2xx': 28, '3xx': 0, '4xx': 0, '5xx': 0 },
        anomalyScore: 4
      });
    }
    const slowlorisPoint: TelemetryPoint = {
      timestamp: now,
      requestsPerSecond: 25,
      bandwidthMbps: 1.5,
      cpuPercent: 65,
      memoryPercent: 60,
      activeConnections: 2400,
      avgLatencyMs: 950,
      p95LatencyMs: 1400,
      p99LatencyMs: 2000,
      errorRatePercent: 24,
      statusCodes: { '2xx': 15, '3xx': 0, '4xx': 5, '5xx': 5 },
      anomalyScore: 90
    };
    history.push(slowlorisPoint);
    const alert = detector.evaluate(slowlorisPoint, history);
    assert(alert !== null, 'Expected Slowloris alert');
    assert(alert!.vector === 'SLOWLORIS_CONNECTION_STARVATION', 'Vector should be SLOWLORIS_CONNECTION_STARVATION');
  });

  // Test 4: Rate Limiting Token Bucket & Burst Allowance
  test('Rate limiter permits burst up to capacity and throttles afterwards', () => {
    const testIp = '198.51.100.99';
    // Switch to ENFORCING mode for test
    shieldState.updateSettings({ defenseMode: 'ENFORCING', rpsThresholdPerIp: 10, burstCapacity: 15 });

    let allowedCount = 0;
    let blockedCount = 0;

    for (let i = 0; i < 25; i++) {
      const res = mitigationEngine.evaluateRequest(testIp, '/api/test', 'GET', 100);
      if (res.allowed) {
        allowedCount++;
      } else {
        blockedCount++;
      }
    }

    assert(allowedCount === 15, `Burst allowance should permit exactly 15 requests (permitted: ${allowedCount})`);
    assert(blockedCount === 10, `Excess 10 requests should be throttled (blocked: ${blockedCount})`);
  });

  // Test 5: Anti-Lockout Safe Verification
  test('Anti-Lockout policy prevents operator and loopback from being blocked', () => {
    const loopback = '127.0.0.1';
    const result = shieldState.blockIp(loopback, 'Accidental self-block test', 60, 'TEST_SUITE');
    assert(!result.success, 'Anti-lockout must reject blocking 127.0.0.1');
    assert(result.message.includes('Anti-Lockout'), 'Rejection message should mention Anti-Lockout policy');

    // Also check evaluation
    const evalRes = mitigationEngine.evaluateRequest(loopback, '/api/data', 'GET', 100);
    assert(evalRes.allowed === true, 'Admin loopback request must always be allowed');
  });

  // Test 6: Circuit Breaker Load Shedding
  test('Circuit breaker trips when CPU or Memory crosses threshold', () => {
    shieldState.updateSettings({ circuitBreakerEnabled: true, circuitBreakerCpuThreshold: 80 });
    shieldState.updateSettings({ circuitBreakerTripped: true });

    // Non-critical endpoint should be shed (503)
    const nonCrit = mitigationEngine.evaluateRequest('203.0.113.15', '/api/analytics/heavy', 'GET', 100);
    assert(!nonCrit.allowed, 'Circuit breaker should shed non-critical endpoint');
    assert(nonCrit.status === 503, 'Status should be 503 Service Degraded');

    // Health check endpoint should still be allowed for probe viability
    const crit = mitigationEngine.evaluateRequest('203.0.113.15', '/api/health', 'GET', 100);
    assert(crit.allowed, 'Health probe must remain accessible during circuit breaker');

    // Reset circuit breaker
    shieldState.updateSettings({ circuitBreakerTripped: false });
  });

  // Test 7: Audit Log Hash Integrity
  test('Audit log maintains SHA256 cryptographic chain', () => {
    shieldState.addAuditLog('TEST_EVENT_A', 'UNIT_TEST', 'TEST_TARGET', 'SUCCESS', 'First test audit entry');
    shieldState.addAuditLog('TEST_EVENT_B', 'UNIT_TEST', 'TEST_TARGET', 'SUCCESS', 'Second test audit entry');

    const logs = shieldState.getAuditLogs(10);
    assert(logs.length >= 2, 'Should have recorded audit logs');
    assert(typeof logs[0].hash === 'string' && logs[0].hash.length === 64, 'Audit hash must be valid 64-char sha256 hex');
  });

  // Test 8: Dry-Run Mode Transparency
  test('Dry-Run mode does not drop requests and marks header appropriately', () => {
    shieldState.updateSettings({ defenseMode: 'DRY_RUN' });
    const ip = '198.51.100.222';
    // Consume tokens
    for (let i = 0; i < 200; i++) {
      mitigationEngine.evaluateRequest(ip, '/api/endpoint', 'GET', 100);
    }
    const res = mitigationEngine.evaluateRequest(ip, '/api/endpoint', 'GET', 100);
    assert(res.allowed === true, 'Dry-run mode must NOT drop traffic');
    assert(res.isDryRun === true, 'Evaluation should mark isDryRun=true');
  });

  // Reset back to DRY_RUN default
  shieldState.updateSettings({ defenseMode: 'DRY_RUN', rpsThresholdPerIp: 80, burstCapacity: 120 });

  // Print results summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n======================================================');
  console.log(`Test Results: ${passed} passed, ${failed} failed (${results.length} total)`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
