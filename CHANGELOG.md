# Changelog — DDoS Shield AI

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] — Advanced Modern Architecture Upgrade

### Added
- **Full-Stack Node.js & Express Architecture**:
  - Implemented modular Express server with sub-second Server-Sent Events (`/api/telemetry/stream`).
  - State management engine (`server/state.ts`) with sliding-window time-series data storage.
  - RESTful control plane API (`server/routes.ts`) with validation and defensive interceptor middleware.
- **AI-Assisted Anomaly Detection & Forensic Reasoning**:
  - Statistical Z-score 3σ anomaly detection algorithm evaluating dynamic moving standard deviation.
  - Multi-dimensional attack vector classification (Volumetric, Layer 7 HTTP flood, Slowloris socket starvation, Credential stuffing).
  - Gemini 3.8 Flash AI reasoning integration (`server/ai.ts`) for automated incident root cause analysis, false-positive probability scoring, blast radius estimation, and remediation rule generation.
- **Automated Defensive Protection & Rate Limiting**:
  - Token bucket rate limiter with configurable burst capacities and per-IP quotas.
  - Safe **Dry-Run Mode** preventing accidental business disruptions while logging proposed mitigations.
  - **Anti-Lockout Protection Engine** ensuring operator loopback (`127.0.0.1`), configured CIDRs, and management subnets can never be banned.
  - Automated **Circuit Breaker** load shedding triggering 503/429 gracefully with `Retry-After` headers when CPU or memory bounds are breached.
  - Dynamic **WAF / Reverse Proxy Rule Exporter** generating ready-to-run configurations for NGINX, Cloudflare WAF, and Linux raw kernel `iptables`.
- **Cybersecurity Operations Center (SOC) Dashboard UI/UX**:
  - Dark and Light high-contrast SOC themes with zero-pill typographic discipline.
  - Real-time SVG dual-axis charts with live telemetry points, threshold markers, and latency distributions.
  - Interactive **Threat Radar** breakdown and anomaly risk dial.
  - Interactive **Scenario Simulator** enabling 1-click synthetic injection of attacks for safe policy validation.
  - Complete **Incident Response Center** with evidence logs, admin notes, status workflow, and export to CSV, JSON, and printable PDF.
  - Tamper-evident **Audit Log** with SHA-256 cryptographic hash chaining.
- **Automated Test Verification**:
  - 8 automated tests covering normal baseline, anomaly alerts, Slowloris classification, token bucket rate limits, anti-lockout safety, circuit breaker, audit chaining, and dry-run transparency.
- **DevOps & Production Readiness**:
  - Added multi-stage `Dockerfile` and `docker-compose.yml`.
  - Added GitHub Actions automated CI workflow (`.github/workflows/ci.yml`).
  - Added `SECURITY.md`, `CONTRIBUTING.md`, and complete `.env.example`.

### Changed
- Upgraded project metadata, HTML entry point, and build configuration for production security.
- Migrated dev server execution script to `tsx server.ts` running Express on port 3000 with Vite middleware.

### Fixed
- Fixed unhandled socket descriptor exhaustion vulnerabilities by introducing aggressive client timeout configurations.
- Fixed lack of operator protection by guaranteeing administrative IP immunity in the state store.
