# API Security Audit — Enterprise Report

**Audit date:** February 2025  
**Scope:** API-only (Backend Express, routes, auth, validation, BOLA/IDOR, rate limiting, headers, data protection, deployment, dependencies, uploads, logging)  
**Classification:** Confidential — Internal Use

---

## Tech Stack (Identified)

| Layer     | Technology |
|----------|------------|
| Backend  | Node.js |
| Framework| Express 4.x |
| Database | MongoDB (Prisma ODM) |
| Hosting  | VPS + Nginx (deployment/); API base URL not specified |

**API Base URL:** Set `NEXT_PUBLIC_API_URL` in production (e.g. `https://api.yourdomain.com/api`).

---

## Executive Summary

The API uses JWT auth, RBAC for admin, rate limiting, bcrypt, and Prisma (parameterized access). **Strengths:** Ownership checks on ads, chat rooms, and orders; explicit ad update whitelist in repository; many routes validated with express-validator. **Risks:** Ad status is user-settable (bypass moderation); some routes leak stack/errors in responses; public endpoints expose version/env and payment mode; `/api/test` and similar must stay dev-only; dependency vulnerabilities and CORS/session hardening needed. This document lists all findings with risk level, exploitation, step-by-step fix, code examples, production checklist, and recommended tools.

---

# 1. Authentication & Authorization

## 1.1 JWT / Session Security

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| A1 | JWT algorithm not pinned | **Medium** | Attacker sends token with `alg: none` or weak alg to bypass verification. | Pin algorithm in sign/verify (already applied: `HS256` in `utils/jwt.js` and `middleware/auth.js`). |
| A2 | Token in js-cookie (client-readable) | **Medium** | XSS can read cookie and exfiltrate token. | Prefer HttpOnly cookie set by API on login; or ensure strict CSP and no unsanitized user content in DOM. |
| A3 | Session secret fallback in production | **High** | Empty or weak session secret weakens OAuth/session fixation. | Require `SESSION_SECRET` when `NODE_ENV=production`; exit if missing. |
| A4 | Refresh flow uses same JWT | **Low** | `/auth/refresh-token` requires valid JWT; no separate refresh token. | Optional: implement refresh tokens (short-lived access + long-lived refresh) and rotate on use. |

**Secure code example — JWT verify (already in place):**

```javascript
// middleware/auth.js
decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
```

---

## 1.2 Role-Based Access Control

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| A5 | Admin routes protected | **OK** | — | All `/api/admin` use `authenticate` + `authorize('ADMIN')`. |
| A6 | Payment test-users available to any authenticated user in dev | **Low** | In dev, non-admin can call `/api/payment-gateway/test-users`. | Already restricted: dev mode or ADMIN. Ensure `PAYMENT_GATEWAY_DEV_MODE` is false in production. |

---

## 1.3 Token Expiration & Refresh

- **Current:** JWT expiry from `JWT_EXPIRES_IN` (default 7d). Refresh endpoint exists but re-issues same type of token.
- **Recommendation:** Use 7d only for “remember me”; use 15–60 min for access token and implement refresh token with rotation and family revocation.

---

## 1.4 Admin API Protection

- **Current:** Admin router uses `router.use(authenticate); router.use(authorize('ADMIN'));` — all admin routes require valid JWT and ADMIN role.
- **Recommendations:** Add admin-specific rate limit (e.g. 50 req/15 min); consider IP allowlist or 2FA for admin accounts; ensure admin panel is only served over HTTPS.

---

# 2. Input & Data Validation

## 2.1 SQL / NoSQL Injection

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| B1 | Prisma used for all DB access | **OK** | Prisma parameterizes queries; MongoDB driver used via Prisma. | No change; avoid raw queries with user input. |
| B2 | Raw queries in scripts | **Low** | `$executeRawUnsafe` in migration scripts with static strings only. | Keep raw usage to scripts; never pass user input. |
| B3 | system.js health uses `$queryRaw\`SELECT 1\`` | **Info** | MongoDB Prisma may not support SQL; could throw. | Use MongoDB-native check (e.g. `prisma.$runCommandRaw({ ping: 1 })` or catch and report “degraded”). |

---

## 2.2 XSS / Command Injection

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| B4 | API returns JSON; no HTML rendering | **OK** | XSS is primarily a frontend concern. | Ensure frontend never renders user content with `dangerouslySetInnerHTML` without sanitization. |
| B5 | Command injection | **OK** | No `exec`, `spawn`, or shell calls with user input found. | Continue to avoid passing user input into shell/exec. |

---

## 2.3 Parameter Tampering

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| B6 | Query params validated on main ad/category routes | **OK** | express-validator used (e.g. page, limit, condition, sort). | Keep validation; add validation to any new query params. |
| B7 | Ad update accepts `status` from body | **High** | Owner can send `PUT /api/ads/:id` with `status: "APPROVED"` and bypass moderation. | Do not allow `status` (and other sensitive fields) from non-admin context; whitelist in controller or repository (see fix below). |

**Secure code example — restrict status in user update:**

```javascript
// In AdController.updateAd or AdService.updateAd - for non-admin, strip status
const allowedStatusesForUser = ['INACTIVE', 'SOLD']; // only allow user to mark sold or deactivate
if (adData.status && !allowedStatusesForUser.includes(adData.status)) {
  delete adData.status; // or reject with 400
}
// Or: in AdRepository.update, only set status when called from admin context (e.g. pass role).
```

---

## 2.4 Mass Assignment

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| B8 | Ad create/update use explicit field mapping | **OK** | AdController builds adData from specific keys; AdRepository.update uses explicit spread of allowed fields. | Good pattern. |
| B9 | Ad update allows `status`, `expiresAt`, `premiumExpiresAt` from body | **High** | Same as B7; user can set approval/expiry. | Restrict status as above; only allow `expiresAt`/`premiumExpiresAt` from admin or system. |

---

# 3. API Endpoint Security

## 3.1 Public vs Private APIs

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| C1 | `/api/auth/*` (login, register, send-otp, verify-otp, forgot-password, reset-password) | **OK** | Intended public. | Keep; rate limit in place. |
| C2 | `/api/test/*` (test-email) | **High** | In production could allow OTP abuse / info disclosure. | Already fixed: mounted only when `NODE_ENV !== 'production'`. |
| C3 | `/api/ai/ad-price-suggestion` | **Medium** | No auth; anyone can query price suggestions and scrape data. | Add rate limit and/or require authentication; consider captcha for anonymous. |
| C4 | `/api/system/version`, `/health`, `/status`, `/readiness` | **Low** | Expose node version, env, uptime; health/readiness can leak DB/error messages. | Restrict /version and /readiness to internal or admin; sanitize health/readiness (no stack, minimal error text in prod). |
| C5 | `/api/payment-gateway/status` | **Low** | Exposes `devMode` and partial Razorpay key. | Return only generic “configured”/“not configured”; do not expose key prefix in production. |

---

## 3.2 Unauthorized Access

- **Protected routes:** User routes, ads (create/update/delete), chat, wallet, orders, reports, etc. use `authenticate`. **OK.**
- **Optional auth:** Geocoding uses `optionalAuthenticate`; acceptable for “detect location” and “geocode” that work without user.

---

## 3.3 Broken Object Level Authorization (BOLA) / IDOR

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| C6 | Ads: update/delete check ownership in AdService | **OK** | `existingAd.userId !== userId` returns 403. | No change. |
| C7 | Chat: room messages check membership | **OK** | `room.user1Id !== req.user.id && room.user2Id !== req.user.id` → 403. | No change. |
| C8 | User orders/invoice: check `order.userId !== req.user.id` | **OK** | 403 if order belongs to another user. | No change. |
| C9 | User public profile `GET /user/public/:userId` | **Low** | Returns email/phone if showPhone; any user can enumerate IDs. | Consider rate limit; ensure email/phone only when showPhone and no PII in response beyond what’s needed. |

---

# 4. Rate Limiting & Abuse Protection

## 4.1 Current State

- **General API:** 200 req/15 min per IP (production); 500 in dev.
- **Auth:** 15 req/15 min per IP (production); 30 in dev.
- **Nginx:** `api_limit` 10r/s, `auth_limit` 5r/s in deployment config.

## 4.2 Gaps

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| D1 | No per-route stricter limit for login/send-otp | **Medium** | Brute force or OTP bombing. | Add route-level limit (e.g. 5/15 min for `/auth/login`, `/auth/send-otp`). |
| D2 | No account lockout after N failed logins | **Medium** | Brute force a known email/phone. | After 5 failed attempts, lock account or require CAPTCHA/cooldown. |
| D3 | AI and geocoding not specifically limited | **Low** | Scraping or cost abuse. | Apply same global limit or slightly stricter for `/api/ai`, `/api/geocoding`. |

**Secure code example — stricter auth limit:**

```javascript
// In server.js, before app.use('/api/auth', authLimiter)
const authStrictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many attempts. Try again later.' },
  standardHeaders: true,
});
app.use('/api/auth/login', authStrictLimiter);
app.use('/api/auth/send-otp', authStrictLimiter);
```

---

# 5. CORS & Headers

## 5.1 CORS

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| E1 | In dev, unknown origins allowed | **Medium** | Malicious site can call API with user credentials if user visits it. | Remove “allow any origin” in dev; use explicit list (e.g. `http://localhost:3000`). |
| E2 | Production uses allowedOrigins list | **OK** | FRONTEND_URL and localhost in list. | Ensure FRONTEND_URL is exact production origin (no wildcard). |

---

## 5.2 Security Headers

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| E3 | Helmet used but CSP disabled | **Medium** | XSS impact not mitigated by CSP. | Enable CSP in Helmet with strict directives (see SECURITY_AUDIT.md). |
| E4 | HSTS / X-Frame in Nginx | **OK** | deployment/nginx.conf sets HSTS, X-Frame-Options. | Ensure Nginx is in front in production. |

---

# 6. Data Protection

## 6.1 Encryption at Rest & Transit

- **Transit:** TLS in Nginx; ensure API is only over HTTPS in production.
- **Rest:** MongoDB; use encryption at rest (Atlas or VM disk encryption).

## 6.2 Password Hashing

- **Current:** bcrypt (cost 10) for register, login, reset, change password. **OK.**

## 6.3 Sensitive Data Leaks

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| F1 | Logger redacts password, token, authorization, cookie | **OK** | Pino redact config in place. | Keep; add any new sensitive keys. |
| F2 | Some routes return `error.stack` or `error.message` in JSON | **High** | Attacker gets file paths, code structure, DB/stack info. | In production never send `stack`; send generic message (e.g. “Internal server error”). |
| F3 | Global error handler sends stack only in development | **OK** | `...(env.NODE_ENV === 'development' && { stack: err.stack })`. | Keep; audit all route-level catch blocks. |

**Locations returning stack/message in 500:** geocoding.js, categories.js, user.js, filter-configurations.js, filter-values.js, brands.js, locations.js, premium.js. Fix: in each catch, respond with generic message when `NODE_ENV === 'production'` and do not attach `stack` or raw `error.message` to JSON.

---

# 7. Server & Deployment

## 7.1 Environment Variables

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| G1 | env.template had real credentials | **Critical** | Already fixed; template uses placeholders. | Rotate DB and any leaked secrets if template was ever committed. |
| G2 | Production validates DATABASE_URL, JWT_SECRET | **OK** | validateEnv() in env.js. | Add SESSION_SECRET to required in production. |

## 7.2 Secrets Management

- Use env vars only; never commit .env. For production, use a secrets manager (e.g. AWS Secrets Manager, HashiCorp Vault) and inject at runtime.

## 7.3 Docker/VPS Hardening

- Nginx: rate limits, TLS, deny hidden files. Ensure no version disclosure; run API as non-root; minimal open ports.

---

# 8. Dependency & Package Risks

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| H1 | npm audit: 28 vulnerabilities (express/qs, lodash, aws-sdk, tar, fast-xml-parser) | **High** | DoS, prototype pollution, path overwrite. | Run `npm audit fix`; upgrade express and transitive deps; plan AWS SDK v3 migration. |
| H2 | Supply chain | **Medium** | Compromised package. | Use lockfile (package-lock.json); run `npm ci`; consider Snyk/Dependabot; review install scripts. |

---

# 9. File & Upload Security

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| I1 | Image upload: extension, MIME, magic-byte, 5MB limit | **OK** | Reduces malicious uploads. | Keep. |
| I2 | Avatar filename from `file.originalname` | **Low** | Path traversal if not sanitized. | Sanitize filename (strip path, allow only safe chars). |
| I3 | No malware scanning | **Medium** | Malware in uploaded image (e.g. polyglot). | Optional: ClamAV or cloud scan for production. |

---

# 10. Monitoring & Logging

| ID | Finding | Risk | Exploitation | Fix |
|----|---------|------|--------------|-----|
| J1 | Pino with requestId; sensitive keys redacted | **OK** | Good base for intrusion review. | Add alerting on 401/403 spikes, failed logins, admin access. |
| J2 | No centralized alerting | **Low** | Delayed detection of abuse. | Send logs to SIEM or CloudWatch/Datadog; alert on anomalies. |
| J3 | Some routes log full error/stack to console | **Low** | Logs may contain sensitive data. | Prefer structured logger; avoid logging full body with passwords. |

---

# Vulnerability Summary Table

| ID | Title | Risk | Category |
|----|--------|------|----------|
| A2 | Token in js-cookie (XSS theft) | Medium | Auth |
| A3 | Session secret fallback in prod | High | Auth |
| B7/B9 | User can set ad status (bypass moderation) | High | Validation / Mass assignment |
| C3 | ad-price-suggestion unauthenticated | Medium | Endpoint |
| C4 | System/version and health leak info | Low | Endpoint |
| C5 | Payment status exposes devMode/key prefix | Low | Endpoint |
| D1/D2 | No stricter auth rate limit / lockout | Medium | Rate limit |
| E1 | CORS allows unknown origins in dev | Medium | CORS |
| E3 | CSP disabled | Medium | Headers |
| F2 | Route-level error/stack leakage | High | Data protection |
| G1 | Credentials in template (fixed) | Critical | Env |
| H1 | Dependency vulnerabilities | High | Dependencies |
| I2 | Avatar filename not sanitized | Low | Upload |
| I3 | No malware scan on upload | Medium | Upload |

---

# Step-by-Step Fix Priority

1. **Immediate:**  
   - Enforce ad status restriction for non-admin (see B7/B9).  
   - Remove or sanitize all route-level `stack` / detailed `error.message` in production responses.  
   - Confirm `/api/test` is not mounted in production (already done).  
   - Rotate any secrets if env.template was ever committed.

2. **Short term:**  
   - Require SESSION_SECRET in production; exit if missing.  
   - Stricter rate limit for login and send-otp; optional account lockout.  
   - Tighten CORS (no “allow any” in dev).  
   - Run `npm audit fix` and address remaining high/critical.

3. **Medium term:**  
   - Enable CSP in Helmet.  
   - Auth for ad-price-suggestion or stronger rate limit.  
   - Sanitize health/version responses; restrict to internal/admin.  
   - Avatar filename sanitization; optional malware scanning.

4. **Ongoing:**  
   - Dependency updates and `npm audit` in CI.  
   - WAF/DDoS protection in front of API.  
   - Monitoring and alerting on auth and admin access.

---

# Production-Ready Checklist

- [ ] No real credentials in repo or env templates; secrets rotated if exposed.
- [ ] JWT algorithm pinned (HS256); SESSION_SECRET required in production.
- [ ] Ad update: user cannot set status to APPROVED/PENDING/REJECTED/EXPIRED; only INACTIVE/SOLD allowed for user.
- [ ] All 500 responses in production: generic message; no stack or internal error details.
- [ ] Rate limiting: general + auth; stricter for login/send-otp.
- [ ] CORS: explicit origins only; no wildcard in production.
- [ ] CSP enabled; HSTS and security headers via Nginx.
- [ ] `/api/test` and other debug routes disabled in production.
- [ ] HTTPS only; TLS 1.2+.
- [ ] npm audit clean or only accepted risks documented; CI runs audit.
- [ ] Logging: no sensitive data; alerting on auth failures and admin access.
- [ ] File upload: validation and filename sanitization; optional malware scan.
- [ ] Payment status: no key or devMode detail in production.

---

# Recommended Security Tools

| Purpose | Tool |
|--------|------|
| Dependency scan | npm audit, Snyk, Dependabot |
| Secret scanning | GitGuardian, TruffleHog, GitHub secret scanning |
| SAST | ESLint security plugins, SonarQube |
| API / DAST | OWASP ZAP, Burp Suite, Postman security tests |
| WAF / DDoS | Cloudflare, AWS WAF |
| Monitoring | Datadog, CloudWatch, ELK + alerting |
| Secrets management | AWS Secrets Manager, HashiCorp Vault |

---

*End of API Security Audit. Fill in API Base URL and hosting details for your environment.*
