# Security Audit Report — SellIt Marketplace

**Audit date:** February 2025  
**Scope:** Backend API, Frontend, Auth, Admin, File upload, Infra, Dependencies

---

## Tech Stack (Identified)

| Layer      | Technology |
|-----------|------------|
| Frontend  | Next.js 15, React 19, TypeScript, Tailwind |
| Backend   | Node.js, Express, Prisma |
| Database  | MongoDB (Prisma) |
| Hosting   | Not specified (deployment/ has nginx + PM2 for VPS) |

**Website URL:** Not provided — replace with your production URL where relevant.

---

## Executive Summary

The application has solid foundations: JWT auth, role-based admin, rate limiting, bcrypt password hashing, and Prisma (reducing injection risk). Several issues need attention: **critical** exposure of credentials in a template file (fixed in this audit), test endpoints in production, CSP disabled, JWT algorithm not pinned, token storage in non-HttpOnly cookies, and vulnerable dependencies. Below are findings, fixes, and a production checklist.

---

## 1. Backend Security (API, Authentication, Authorization)

### 1.1 What’s good
- **Authentication:** JWT in `Authorization: Bearer`, verified with `jwt.verify`, user and token invalidation checked.
- **Authorization:** `authorize('ADMIN')` on all admin routes; `authenticate` used on protected routes.
- **Password hashing:** bcrypt with cost 10 in auth and user routes.
- **Validation:** express-validator used on auth and other routes (e.g. register, login).

### 1.2 Risks and fixes

| Risk | Severity | Fix |
|------|----------|-----|
| JWT algorithm not pinned | Medium | In `backend/utils/jwt.js`, use explicit algorithm to prevent alg substitution: `jwt.sign(..., { algorithm: 'HS256', expiresIn: ... })` and `jwt.verify(..., { algorithms: ['HS256'] })`. |
| Optional auth continues on missing JWT_SECRET | Low | In `optionalAuthenticate`, if `!process.env.JWT_SECRET` return `next()` without setting user; document that production must set JWT_SECRET. |
| Dev CORS allows any origin | Medium | In `src/server.js`, remove “in development be more lenient” that calls `callback(null, true)` for unknown origins. Use a strict list (e.g. `http://localhost:3000`) even in dev. |

---

## 2. SQL Injection, XSS, CSRF

### 2.1 SQL / NoSQL injection
- **Prisma:** Most access is via Prisma (parameterized). **MongoDB** is in use; Prisma with MongoDB does not use raw SQL for normal queries.
- **Raw usage:** `backend/routes/system.js` uses `prisma.$queryRaw\`SELECT 1\`` (literal, safe). Scripts like `add-deactivation-fields.js` use `$executeRawUnsafe` with **static** strings (no user input) — low risk but prefer migrations or Prisma schema changes where possible.
- **Recommendation:** Never pass user input into `$executeRawUnsafe` or string-concatenated queries. If you introduce raw SQL/NoSQL, use parameterized APIs only.

### 2.2 XSS
- **Frontend:** One `dangerouslySetInnerHTML` in `app/layout.tsx` for a chunk-loading script — content is static (no user input). Acceptable if kept static; avoid injecting user/content there.
- **API responses:** Ensure ad titles, descriptions, and user-generated content are escaped when rendered (React escapes by default; avoid `dangerouslySetInnerHTML` for user content).
- **Recommendation:** Add a strict Content-Security-Policy (see Section 8).

### 2.3 CSRF
- **State:** No CSRF tokens found. API is JWT-based (Bearer in header); same-origin frontend and correct CORS reduce risk for browser clients.
- **Recommendation:** For cookie-based or same-site form submissions in future, add CSRF tokens (e.g. double-submit cookie or SameSite=Strict + token in header/body).

---

## 3. JWT / Session Security

| Finding | Severity | Fix |
|---------|----------|-----|
| Algorithm not pinned | Medium | Pin HS256 in sign/verify (see 1.2). |
| Token in js-cookie (readable by JS) | Medium | Prefer HttpOnly cookie set by backend (e.g. after login) so XSS cannot steal token. If keeping client-side storage, ensure CSP and XSS controls are strong. |
| Session secret fallback | High in prod | In `src/server.js`, `sessionSecret \|\| (env.NODE_ENV === 'production' ? '' : 'dev-session')` — in production, require SESSION_SECRET (or JWT_SECRET) and exit if missing; never use empty or dev default. |
| JWT expiry | Info | Default 7d is reasonable; consider shorter for sensitive roles (e.g. admin) and refresh tokens. |

---

## 4. Admin Panel Protection

- **Routes:** All `/api/admin` routes use `authenticate` and `authorize('ADMIN')`. Good.
- **Recommendations:**
  - Add rate limiting specific to `/api/admin` (stricter than general API).
  - Consider IP allowlist or 2FA for admin accounts.
  - Ensure admin UI is only served over HTTPS and that admin routes are not discoverable (no public links from non-admin pages).

---

## 5. File Upload & Download Security

### 5.1 Upload (middleware/upload.js)
- **Good:** Extension and MIME allowlist, magic-byte check for images, 5MB limit, watermark applied.
- **Good:** Multer limits and fileFilter; no direct path traversal in filenames (category-based + random).

### 5.2 Gaps
- **Avatar upload:** Uses `avatarLocalStorage` with `file.originalname` for extension — ensure no path traversal (e.g. `..` or `/`) in `originalname`; sanitize or use only a safe extension list.
- **Serving uploads:** `app.use('/uploads', express.static(...))` — ensure uploads directory is outside web root or that nginx/backend does not serve `.env` or source files. Nginx `location /uploads/` alias is correct; avoid serving parent directories.
- **Recommendation:** Add explicit filename sanitization (strip path, allow only `[a-zA-Z0-9._-]`) for any user-influenced filename.

---

## 6. Server & Hosting Security

- **Nginx (deployment/nginx.conf):** HTTP→HTTPS redirect, TLS 1.2/1.3, security headers (HSTS, X-Frame-Options, etc.), rate limiting zones, `location ~ /\.` deny. Good base.
- **Recommendations:**
  - Replace `yourdomain.com` with actual domain and ensure Certbot/SSL is applied.
  - Consider hiding server version and limiting proxy headers to what’s needed.
  - Use a WAF or cloud DDoS protection in front of the origin (see Section 12).

---

## 7. Database Access Control

- **Application:** Single DATABASE_URL/MONGO_URI; Prisma used for all access. No mixed SQL/NoSQL from user input.
- **Recommendations:**
  - Use a DB user with least privilege (read/write only required collections; no drop/global roles).
  - Prefer MongoDB Atlas (or similar) with IP allowlist, auth, and TLS.
  - Rotate DB credentials if they were ever in a template or repo (see Section 14).

---

## 8. Password Encryption & Hashing

- **Implementation:** bcrypt (bcryptjs) cost 10 for registration, login, reset, and change-password. Good.
- **Recommendation:** Keep password field out of API responses and logs (already redacted in logger). Ensure Prisma `select` never returns `password` unless needed for comparison.

---

## 9. Rate Limiting & Brute-Force Protection

- **Current:** express-rate-limit: general API 200/15min (prod), auth 15/15min (prod); nginx `api_limit` and `auth_limit`. Good.
- **Recommendations:**
  - Add a stricter limit for `/api/auth/login` and `/api/auth/send-otp` (e.g. 5/15min per IP).
  - Consider lockout after N failed logins per account (e.g. 5 failures → 15 min lockout or require CAPTCHA).
  - Optionally use Redis store for rate limits across instances.

---

## 10. HTTPS / SSL / CORS

- **HTTPS:** Nginx configured for TLS and HSTS. Ensure Certbot is run and certs are renewed.
- **CORS:** Backend allows specific origins; dev has an override that allows unknown origins — tighten as in Section 1.2.
- **Frontend:** Use `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` over HTTPS in production (no mixed content).

---

## 11. Environment Variables Protection

- **Critical (fixed in this audit):** `deployment/env.template` contained **real MongoDB credentials**. It has been replaced with placeholders. If that file was ever committed or shared:
  1. Rotate MongoDB password immediately.
  2. Invalidate any leaked secrets (JWT_SECRET, SESSION_SECRET, etc.) and rotate them.
  3. Ensure `.env` and `env.template` never contain real secrets; use placeholders only.
- **.gitignore:** `.env` and `.env*.local` are ignored. Good.
- **Frontend:** Only `NEXT_PUBLIC_*` and build-time vars are safe for client; never put server secrets in `NEXT_PUBLIC_*`.

---

## 12. API Abuse & DDoS Protection

- **Current:** Application and nginx rate limits help. No dedicated DDoS/WAF in repo.
- **Recommendations:**
  - Put the app behind Cloudflare, AWS WAF, or similar (rate limiting, bot detection, DDoS mitigation).
  - Consider request body size limits (express already has 10mb; ensure it’s appropriate).
  - Add health check that doesn’t return stack traces or internal details.

---

## 13. Test / Debug Endpoints

| Risk | Severity | Fix |
|------|----------|-----|
| `/api/test` (test-email) exposed | High | Disable in production: mount `testEmailRoutes` only when `env.NODE_ENV !== 'production'`, or guard with a secret header and remove in prod. |
| Test email returns fixed OTP in response | Medium | Do not return `code: testCode` in response; log only server-side. |

**Example fix for server.js:**

```javascript
if (env.NODE_ENV !== 'production') {
  app.use('/api/test', testEmailRoutes);
}
```

---

## 14. Third-Party Library Vulnerabilities

**npm audit (backend):** 28 vulnerabilities (1 low, 1 moderate, 26 high).

- **express / body-parser / qs:** DoS (arrayLimit). Run `npm audit fix` (non-breaking).
- **lodash:** Prototype pollution. Run `npm audit fix`.
- **fast-xml-parser** (via AWS SDK): DoS. Fix via `npm audit fix` where possible; track AWS SDK v3 updates.
- **aws-sdk v2:** Region validation and maintenance mode. Plan migration to AWS SDK v3.
- **tar / @tensorflow/tfjs-node:** Fix may require `npm audit fix --force` (breaking); evaluate and upgrade when possible.

**Recommendations:**
- Run `npm audit fix` and re-run `npm audit`.
- For unfixable or breaking items, upgrade packages to patched versions when available; consider replacing or isolating (e.g. run heavy/vulnerable code in a worker or separate service).
- Integrate `npm audit` into CI and treat high/critical as failing.

---

## 15. Malware / Backdoor Detection

- No automated scan was run. Recommendations:
  - Run `npm audit` and fix critical/high.
  - Use `snyk` or similar for dependency and code checks.
  - Periodically scan repo and deployment (e.g. ClamAV, GitHub Advanced Security, or your host’s scanner).
  - Restrict install scripts: use `npm ci` and consider `--ignore-scripts` for untrusted deps until reviewed.

---

## 16. Content-Security-Policy (CSP)

- **Current:** `contentSecurityPolicy: false` in Helmet. CSP is effectively disabled.
- **Risk:** Eases XSS impact and data exfiltration.
- **Fix:** Enable CSP in `src/server.js` with a strict policy, e.g.:

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", env.FRONTEND_URL, "https://*.googleapis.com", "wss:", "https:"],
      frameAncestors: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
```

Tune `scriptSrc`/`styleSrc` to match your frontend (e.g. inline scripts in layout). Prefer nonce or hash for inline scripts if possible.

---

## Step-by-Step Fix Priority

1. **Immediate**
   - Rotate MongoDB password and any other secrets if `env.template` was ever committed or shared (credential exposure fix is already applied to the template).
   - Disable `/api/test` in production (see Section 13).
   - Require SESSION_SECRET (or JWT_SECRET) in production and remove empty/dev fallback for session secret.

2. **Short term**
   - Pin JWT algorithm to HS256 in `utils/jwt.js`.
   - Tighten CORS (no “allow any origin” in dev).
   - Run `npm audit fix` and address remaining high/critical issues.
   - Enable CSP in Helmet (and adjust for your frontend).

3. **Medium term**
   - Move JWT to HttpOnly cookie (backend sets cookie on login; frontend sends with credentials).
   - Stricter rate limits for login/OTP and optional account lockout.
   - Admin-specific rate limit and optional 2FA/IP allowlist.
   - Plan migration from AWS SDK v2 to v3 and upgrade tensorflow/tar where feasible.

4. **Ongoing**
   - Use WAF/Cloudflare (or similar) for DDoS and abuse.
   - Keep dependencies updated; run `npm audit` in CI.
   - Periodic credential rotation and access reviews.

---

## Recommended Security Tools

| Purpose | Tool |
|--------|------|
| Dependency vulnerabilities | `npm audit`, Snyk, Dependabot |
| Secret scanning | GitGuardian, TruffleHog, GitHub secret scanning |
| SAST / code quality | ESLint security plugins, SonarQube |
| DAST / API testing | OWASP ZAP, Burp Suite |
| Infra / config | Prowler (AWS), CIS benchmarks |
| WAF / DDoS | Cloudflare, AWS WAF, Akamai |

---

## Production Security Checklist

- [ ] All secrets in env vars only; no real credentials in repo or templates.
- [ ] JWT_SECRET and SESSION_SECRET strong and unique; rotated if ever exposed.
- [ ] MongoDB (and any DB) password rotated if it was in a template; DB user least-privilege.
- [ ] HTTPS only; valid certs; HSTS enabled.
- [ ] CORS restricted to known frontend origin(s); no wildcard in production.
- [ ] Rate limiting on API and auth; stricter for login/OTP/admin.
- [ ] `/api/test` and other debug routes disabled or removed in production.
- [ ] CSP enabled and tuned; no unsafe-inline/unsafe-eval unless necessary and documented.
- [ ] Helmet and security headers applied (X-Frame-Options, X-Content-Type-Options, etc.).
- [ ] File upload: type/size/magic-byte checks; safe filenames; uploads not executable.
- [ ] Admin routes require auth + admin role; consider 2FA or IP allowlist.
- [ ] Passwords hashed with bcrypt (cost ≥10); never logged or returned in API.
- [ ] JWT algorithm pinned (e.g. HS256); token storage secure (prefer HttpOnly cookie).
- [ ] `npm audit` clean or only accepted risks documented; CI runs audit.
- [ ] Error responses in production do not expose stack traces or internal paths.
- [ ] Nginx (or reverse proxy) rate limiting and TLS configured; hidden server version.
- [ ] Backups and restore tested; DB access audited.
- [ ] Incident response and rotation procedure for compromised secrets.

---

*End of Security Audit Report. Fill in your production URL and hosting details where applicable.*
