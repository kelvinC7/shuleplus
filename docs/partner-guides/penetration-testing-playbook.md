# ShulePlus — Security & Penetration Testing Playbook

Use this before Bank of Africa go-live and for ongoing assurance. It matches what you can honestly tell partners: start with structured self-assessment, then hire an **external** pen test for the BOA letter.

---

## 1. What penetration testing is

| Type | Who | Purpose |
|------|-----|---------|
| **Vulnerability scan** | Automated tools | Find known CVEs, misconfigurations, missing headers |
| **Penetration test** | Skilled human + tools | Chain issues (e.g. leak data, bypass auth, escalate) |
| **Red team** | Advanced | Full attack simulation (usually later stage) |

For BOA due diligence you need at least: **external pen test report** (executive summary + remediation) on partner-facing surfaces.

---

## 2. Scope for ShulePlus (minimum)

Test from the **internet**, as a bank or attacker would:

1. **TLS / Nginx** — `shuleplus.rw`, `fees.shuleplus.rw`, `students-api.shuleplus.rw`, `babyeyi-api.shuleplus.rw`
2. **Public fees APIs** — lookup, student-fees, initiate, status (abuse, injection, rate limits)
3. **IAM** — `/api/v1/developers/oauth/token`, login, MFA, Developer Portal
4. **Authentication Frontend** — `shuleplus.rw/developers`, Super Admin (if exposed)
5. **Server** — SSH not open to world, only 443/80, firewall, OS patches

**Out of scope initially:** full internal LAN, every microservice port on localhost (test via gateway/public only unless internal audit).

---

## 3. Phase A — Do this week (free / low cost)

### A1. Dependency vulnerabilities

On your dev machine and on server before deploy:

```bash
cd Authentication/Backend && npm audit
cd SchoolFeesPortal/Backend && npm audit
cd StudentManagement/Backend && npm audit
```

Fix **critical** and **high** before production; document accepted risks for medium.

### A2. TLS and headers

```bash
# From any machine with openssl
openssl s_client -connect fees.shuleplus.rw:443 -tls1_2 </dev/null 2>/dev/null | head -20
```

Online (optional): SSL Labs test on `fees.shuleplus.rw` — aim for A- or better, TLS 1.2+ only.

Check response headers on APIs:

```bash
curl -sI https://fees.shuleplus.rw/api/health
```

Add if missing (Nginx): `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.

### A3. OWASP ZAP (automated DAST)

1. Install [OWASP ZAP](https://www.zaproxy.org/download/).
2. **Automated Scan** against:
   - `https://fees.shuleplus.rw/api/health`
   - `https://students-api.shuleplus.rw/api/health`
   - `https://shuleplus.rw/developers/login` (passive + limited active)
3. Export HTML report; triage **High** and **Medium** alerts.

Do **not** run aggressive scan on production during school hours without maintenance window.

### A4. Manual API abuse (public fees)

Use Postman or curl:

| Test | Expect |
|------|--------|
| Invalid JSON body on initiate | 400, no stack trace in response |
| SQL-like strings in `studentCode` | 400/404, no DB error leaked |
| Huge `amount` / negative | 400 |
| Random `reference` on status | 404 |
| Very high request rate (100+ in 1 min) | 429 or stable 200/4xx (note if no rate limit — gap) |

**Honest gap:** Public fees APIs have no OAuth today — document rate limiting / WAF / IP allowlist if BOA requires.

### A5. OAuth / Developer Portal

- Wrong `client_secret` → 401
- Expired token → 401
- Token from SANDBOX app against PRODUCTION data → should fail (403)
- Brute force login → lockout or rate limit (verify)

### A6. Server hardening checklist (SSH to prod)

- [ ] `ufw` or firewall: deny all except 22 (from your IP only), 80, 443
- [ ] SSH: key-only, no root password login
- [ ] PostgreSQL: listen `127.0.0.1` only, not public
- [ ] PM2 processes run as non-root if possible
- [ ] `.env` not world-readable
- [ ] Automatic security updates or monthly patch calendar

---

## 4. Phase B — External penetration test (for BOA)

Hire an **independent** firm (Rwanda or regional). Provide:

**Statement of work (SOW) excerpt:**

- Black-box and grey-box test of URLs in Section 2
- OAuth client credentials for SANDBOX only (never prod secrets in SOW email)
- 5–10 business days testing + report
- Deliverables: executive summary (shareable with BOA), technical findings, retest after fixes

**Rwanda / East Africa options (research current vendors):**

- Local ISO/cyber consultancies in Kigali
- Regional firms (Serianu, etc. — verify current offerings)
- International: Cobalt, Intruder (continuous), or boutique OWASP-focused shops

**Budget hint:** Small-scope API + web pen test often **USD 3k–15k** depending on firm and retest; get 2 quotes.

**After report:**

1. Fix critical/high within your patching SLA (72h / 7d)
2. Retest or written confirmation from vendor
3. Attach **executive summary** to BOA (NDA)

---

## 5. Phase C — Stay secure (ongoing)

| Activity | Frequency |
|----------|-----------|
| `npm audit` on deploy | Each release |
| OS patches on server | Monthly or critical immediate |
| Review privileged SSH users | Quarterly |
| External pen test | Annual (before major partner) |
| Backup restore drill | Semi-annual |
| Incident contact list updated | When staff changes |

---

## 6. What to tell Bank of Africa (truthful timeline)

**Today:** Phase A self-assessment + ZAP report internal.  
**Before production with BOA:** Phase B external pen test scheduled/completed; share summary under NDA.  
**Gap closure:** Rate limits on public APIs, Idempotency-Key, optional IP allowlist — track in integration backlog.

---

## 7. Tools reference

| Tool | Use |
|------|-----|
| OWASP ZAP | Web/API automated scan |
| Burp Suite Community | Manual API tampering |
| `nmap` | Open ports (run only on your own server/IP with permission) |
| `nuclei` | Template-based CVE checks |
| `npm audit` / Dependabot | Dependency CVEs |
| Mozilla Observatory / securityheaders.com | Header grade |

**Legal:** Only test systems you own or have written permission to test (your prod, your sandbox). Do not scan BOA’s systems without their approval.

---

## 8. Sample email to pen test vendor

```
Subject: RFP — External penetration test (fintech API integration)

We are ShulePlus (Rwanda), integrating school fees payment APIs with a bank partner.
Scope: HTTPS APIs on *.shuleplus.rw (student lookup, fees, payments, IAM OAuth, developer portal).
Environment: SANDBOX credentials provided under NDA.
Deliverables: Executive summary for bank due diligence + full technical report + one retest.
Timeline: [dates]
Please quote fixed price and team qualifications (OSCP/CEH/etc.).
```

---

*Internal use — Theoneste IT / ShulePlus*
