# Contributing to DDoS Shield AI

Thank you for your interest in improving DDoS Shield AI! We welcome contributions from the cybersecurity and software engineering community.

---

## Code of Conduct & Safety Guidelines

1. **Strictly Defensive**: Under no circumstance will contributions adding offensive packet flooding, botnet communication, reflection vectors, or unauthorized scraping be accepted.
2. **Anti-Lockout Invariant**: Any pull request modifying `server/state.ts` or `server/mitigation.ts` must maintain or strengthen administrator anti-lockout verification.
3. **Automated Testing**: All contributions must include automated test coverage in `tests/run-tests.ts`. Tests must run and pass cleanly with `npm test`.
4. **No Secrets**: Never commit private keys, API keys, credentials, or sensitive network telemetry.

---

## Development Workflow

1. Fork and clone the repository.
2. Create a feature branch: `git checkout -b feature/enhanced-entropy-detector`.
3. Install dependencies: `npm install`.
4. Run tests: `npm test`.
5. Run linting: `npm run lint`.
6. Submit a pull request with a clear description of the problem solved, test evidence, and risk analysis.
