# DDoS Shield AI — Advanced Version 2.0

![DDoS Shield AI Banner](https://img.shields.io/badge/Status-Operational%20v2.0-00E5FF?style=flat-square)
![Build](https://img.shields.io/badge/Build-Passing-00E676?style=flat-square)
![License](https://img.shields.io/badge/License-Apache--2.0-blue?style=flat-square)
![Engine](https://img.shields.io/badge/AI-Gemini%203.8%20Flash-9C27B0?style=flat-square)

DDoS Shield AI 2.0 is a modern, full-stack, AI-assisted denial-of-service detection, real-time traffic monitoring, forensic incident response, and automated defensive mitigation platform.

It bridges statistical anomaly telemetry with real-time AI reasoning via Google Gemini, enabling security operations (SecOps) teams and infrastructure engineers to detect Layer 3/4 volumetric floods and stealthy Layer 7 application resource exhaustion attacks without causing accidental administrator lockouts or false-positive customer disruptions.

---

## 1. System Architecture

```
                                  [ Incoming Public Traffic ]
                                               │
                                               ▼
                              ┌──────────────────────────────────┐
                              │  DDoS Shield AI Defensive Edge   │
                              │  (Token Bucket Rate Limiting,    │
                              │   Payload Bounds, Anti-Lockout)  │
                              └────────────────┬─────────────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
      ┌──────────────────────────────────┐            ┌──────────────────────────────────┐
      │     Statistical Anomaly Engine   │            │   Automated Mitigation Policies  │
      │  - Z-score 3σ RPS deviation      │            │  - Dynamic CIDR/IP Quarantine   │
      │  - Socket pool exhaustion monitor│            │  - Burst allowance & quotas      │
      │  - 4xx/5xx status error surges   │            │  - Circuit breaker load shedding │
      │  - Ingress bandwidth spikes      │            │  - Reverse-proxy NGINX exporter  │
      └────────────────┬─────────────────┘            └────────────────┬─────────────────┘
                       │                                               │
                       ▼                                               ▼
      ┌──────────────────────────────────┐            ┌──────────────────────────────────┐
      │   Gemini 3.8 Flash AI Forensics  │            │   Immutable Audit Log Chain      │
      │  - Attack classification & vector│            │  - SHA-256 cryptographic hashes  │
      │  - False-positive probability    │            │  - Operator approvals tracking   │
      │  - Blast radius & remediation    │            │  - Automated recovery timers     │
      └────────────────┬─────────────────┘            └──────────────────────────────────┘
                       │
                       ▼
      ┌──────────────────────────────────────────────────────────────────┐
      │           DDoS Shield AI Cyber SOC Web Dashboard 2.0             │
      │  (React 19, TypeScript, Live SSE Telemetry, SVG Visualizers)     │
      └──────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Capabilities

### 🛡️ Real-Time Telemetry & Health Monitoring
- Sub-second Server-Sent Events (SSE) telemetry pipeline emitting real-time RPS, ingress bandwidth (Mbps), CPU/RAM load, active connection socket pools, p50/p95/p99 latency distributions, and HTTP status code ratios.
- Interactive dual-axis SVG visualizers with live inspection points, threshold markers, and historical range zoom (5m, 15m, 1h, 24h).

### 🧠 AI-Assisted Anomaly Detection (Gemini 3.8 Flash)
- Multi-dimensional anomaly detection combining moving standard deviation (Z-scores), connection-to-bandwidth ratios (Slowloris detection), and authentication error spikes (Credential Stuffing).
- Integrated Gemini 3.8 Flash forensic engine that categorizes attacks, estimates false-positive probability, and produces human-readable root cause hypotheses with executive summaries.

### 🛑 Defensive Mitigation & Rate Limiting
- **Token Bucket Algorithm**: Configurable per-IP rate limits with burst capacity buffers.
- **Dry-Run Mode**: Evaluates policies and logs proposed mitigations without dropping legitimate user traffic.
- **Circuit Breaker**: Automatically sheds non-critical endpoints when CPU or RAM crosses operator-defined safety thresholds.
- **Anti-Lockout Protection**: Guaranteed safety mechanism preventing administrative IPs, loopback (`127.0.0.1`), and internal subnets from ever being blocked.
- **WAF & Reverse-Proxy Exporter**: Live-generates copy-paste ready NGINX configurations, Cloudflare WAF JSON expressions, and Linux kernel `iptables` rules.

### 📋 Incident Response Center & Auditing
- Full incident lifecycle tracking: Open, Investigating, Mitigating, Resolved, False Positive.
- Administrator collaborative notes, timeline evidence logging, and one-click export to CSV, JSON, and print-ready PDF incident reports.
- Tamper-evident SHA-256 chained audit logs recording all defensive actions, parameter changes, and manual overrides.

### 🧪 Built-in Scenario Simulator
Test detection policies safely with 1-click synthetic attack scenarios:
- **Normal Traffic**: Typical organic user activity.
- **Layer 7 HTTP GET Flood**: High-RPS compute-heavy endpoint exhaustion.
- **Slowloris Connection Starvation**: Stealthy partial header socket exhaustion.
- **Credential Stuffing**: Distributed authentication brute-force with elevated 4xx error rates.
- **Volumetric Spike**: Ingress bandwidth saturation.

---

## 3. Getting Started

### Prerequisites
- Node.js 20+
- npm 9+
- (Optional) `GEMINI_API_KEY` for AI incident reasoning (fallback rule heuristics are active if omitted).

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
npm test

# 3. Start development server (Full-stack on port 3000)
npm run dev
```

Open your browser to `http://localhost:3000`.

---

## 4. Environment Configuration (`.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port for the full-stack server |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `DEFENSE_MODE` | `DRY_RUN` | Shield mode: `DRY_RUN`, `ENFORCING`, or `LOCKDOWN` |
| `DEFAULT_RPS_THRESHOLD` | `80` | Allowed requests per second per IP |
| `DEFAULT_BURST_CAPACITY` | `120` | Token bucket burst allowance |
| `CIRCUIT_BREAKER_CPU_THRESHOLD` | `85` | CPU % threshold to trigger load shedding |
| `CIRCUIT_BREAKER_RAM_THRESHOLD` | `90` | RAM % threshold to trigger load shedding |
| `ADMIN_SAFE_IPS` | `127.0.0.1,::1,192.168.1.0/24` | Protected IPs immune to automated quarantine |
| `GEMINI_API_KEY` | - | Google Gemini API key for AI reasoning |

---

## 5. Deployment Options

### Option A: Docker & Docker Compose
```bash
docker compose up -d --build
```

### Option B: Linux Server Systemd Service
```bash
npm run build
NODE_ENV=production node server.ts
```

---

## 6. Security & Responsible Use Notice
DDoS Shield AI is designed strictly for defensive monitoring and protection of systems you own or are legally authorized to protect. It does not perform offensive scanning, packet reflection, or attack generation against third parties.

See [SECURITY.md](./SECURITY.md) for vulnerability reporting and [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.
