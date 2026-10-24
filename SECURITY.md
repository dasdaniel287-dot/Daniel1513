# Security Policy — DDoS Shield AI

## 1. Supported Versions

We provide security updates and patches for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| < 2.0.0 | :x:                |

---

## 2. Reporting a Vulnerability

The DDoS Shield AI team takes security vulnerabilities seriously. If you discover a security flaw or vulnerability within this platform:

1. **Do not create a public GitHub issue.**
2. Send an encrypted email or private disclosure report to `security@ddos-shield-ai.local` (or through GitHub Security Advisories).
3. Include the following details:
   - Description of the vulnerability and attack vector.
   - Proof of concept (PoC) or reproduction steps.
   - Estimated impact and affected components.
   - Potential remediation if known.

We acknowledge receipt within 48 hours and aim to provide a remediation patch within 7 business days.

---

## 3. Threat Model & Safeguards

- **Anti-Lockout Guarantee**: Loopback (`127.0.0.1`, `::1`) and configured admin CIDRs are hard-coded with immutability flags in `server/state.ts`. Even during active lockdown, administrative access cannot be revoked by automated policies.
- **Dry-Run Default**: The platform defaults to `DRY_RUN` mode to ensure no production downtime occurs prior to administrative policy tuning.
- **Privacy First (GDPR / CCPA)**: The telemetry engine offers client IP redaction and hashing to avoid retaining PII in logs.
- **Defensive Scope**: This software operates exclusively defensively. It contains no modules for traffic amplification, botnet orchestration, or packet flooding against third parties.
