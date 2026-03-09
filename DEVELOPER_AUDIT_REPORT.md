# Marketplace App – Developer Audit Report

**Project:** Sellit (marketplace)  
**Audit focus:** Development quality, stability, scalability, security  
**Mode:** Development (not marketing/SEO)  
**Last updated:** After rate limiting, structured logging, and search implementation.

---

## 1. Core Functionality

| Area | Status | Notes |
|------|--------|--------|
| **Category & subcategory** | ✔ DONE | Categories + subcategories in DB, API with cache, slug-based routing. Spec config from JSON + DB. |
| **Post ad / listing flow** | ✔ DONE | Create/update/delete with validation, image upload (local/S3/Cloudinary), watermark, moderation hook, ad limit checks, payment order for paid posting. |
| **Search & filter** | ✔ DONE | Filters (price, condition, location, brand/model, attributes) work. **Text search:** Meilisearch when available, Prisma fallback (title/description contains) when not. Category/location applied to search. |
| **User auth (OTP/Login)** | ✔ DONE | Register, login, send-otp, verify-otp, JWT, token invalidation, deactivation, OAuth (Google/Facebook). express-validator on auth routes. |
| **Chat / messaging** | ✔ DONE | Socket.IO with JWT auth, rooms by ad, messages, read state, notifications. |
| **Image upload & compression** | ✔ DONE | Multer, 5MB limit, format/MIME/magic-byte validation, watermark (Jimp), local/S3/Cloudinary. |
| **Location-based filtering** | ✔ DONE | Location slug, city/state, lat/long + radius in AdService, geocoding routes, location-wise ranking. |
| **Payments** | ✔ DONE | Razorpay (orders, verify, webhook), payment-gateway routes, credits, business packages, ad posting orders. |

---

## 2. Code Quality & Architecture

| Area | Status | Notes |
|------|--------|--------|
| **Folder structure** | ⚠ NEED IMPROVEMENT | Backend: mix of legacy `routes/` and Clean Architecture `src/` (auth, ads). Frontend: `app/`, `components/`, `hooks/`, `lib/`, `src/application`. Some duplication (e.g. auth routes old + new). |
| **Naming conventions** | ✔ DONE | Consistent camelCase/PascalCase, clear route and file names. |
| **Reusability** | ✔ DONE | Shared middleware (auth, upload, cache, admin), hooks (useAuth, useAds, useCategories), API client with interceptors. |
| **State management** | ✔ DONE | React Query (TanStack) for server state, React state/hooks for UI. |
| **API design** | ✔ DONE | REST, consistent success/error shape, pagination (page, limit, total), validation on key routes. |
| **Environment config** | ⚠ CRITICAL | **`backend/src/config/env.js` still has hardcoded fallbacks:** `DATABASE_URL`, `MONGO_URI`, and `JWT_SECRET`. Production must use env vars only; remove or empty these defaults. `deployment/env.template` exists. |
| **Separation of concerns** | ⚠ NEED IMPROVEMENT | Ads: Controller → Service → Repository. Auth and other domains still in flat routes; partial Clean Architecture. |

---

## 3. Performance

| Area | Status | Notes |
|------|--------|--------|
| **Page load** | ✔ DONE | Next.js 15, dynamic imports (e.g. PaymentModal), loading.tsx for ads. |
| **API response time** | ✔ DONE | Compression, Redis cache middleware for lists/home-feed/filters/categories; cache TTLs in config. |
| **Caching** | ✔ DONE | Redis (optional, graceful fallback), cache keys by route/query, invalidation on ad create/update. |
| **Lazy loading** | ✔ DONE | Dynamic components, infinite scroll (useInfiniteAds), lazy AdCard. |
| **Database queries** | ✔ DONE | Prisma with select/include, indexes on Ad (status, categoryId, locationId, createdAt, etc.). |
| **Memory** | ✔ DONE | No obvious leaks; upload uses buffers then streams to S3/Cloudinary. |

---

## 4. Stability & Error Handling

| Area | Status | Notes |
|------|--------|--------|
| **Crash points** | ⚠ NEED IMPROVEMENT | Global error middleware logs and returns 500 with requestId. Some deep service paths may still throw without try/catch. Redis/Meilisearch failures are fail-open. |
| **Edge cases** | ⚠ NEED IMPROVEMENT | Empty categories/locations handled. ObjectId validation in AdController. Pagination (e.g. limit 0) partially validated. |
| **Validation** | ✔ DONE | express-validator on auth, ads, admin, payment, chat, etc. Query params validated. |
| **Try/catch** | ⚠ NEED IMPROVEMENT | AdController and key routes use try/catch; not every service path wrapped. |
| **Logging** | ✔ DONE | **Structured logging (pino):** request ID, levels (info/warn/error/debug), redaction of password/token. Used in server, auth middleware, AdController, upload, meilisearch. |
| **Fallback UI** | ✔ DONE | error.tsx (Try again, Go home), not-found.tsx, API client handles network/4xx. |

---

## 5. Security (Minimum Required)

| Area | Status | Notes |
|------|--------|--------|
| **JWT / Auth** | ✔ DONE | JWT verify, expiry, userId, token invalidation (tokenInvalidatedAt), deactivation check. Optional auth for public endpoints. |
| **Rate limiting** | ✔ DONE | **General API:** 200/15 min per IP (prod), 500 in dev. **Auth:** 15/15 min (prod), 30 in dev. `/health` and `/uploads` skipped. |
| **Input sanitization** | ⚠ NEED IMPROVEMENT | express-validator for type/length/format. No dedicated XSS sanitization for rich text (e.g. ad description). React escapes by default. |
| **File upload validation** | ✔ DONE | Extension, MIME, size (5MB), magic-byte check; watermark applied server-side. |
| **HTTPS** | ⚠ NEED IMPROVEMENT | Not enforced in code; deployment (nginx/proxy) should enforce. Cookie `secure` when NODE_ENV === 'production'. |
| **Role-based access** | ✔ DONE | `authenticate` + `authorize('ADMIN')` on admin routes; requireAdmin middleware. |

---

## 6. Database & Backend

| Area | Status | Notes |
|------|--------|--------|
| **Schema design** | ✔ DONE | MongoDB Prisma schema: User, Ad, Category, Subcategory, Location, Chat, Payments, Credits, etc. Relations and enums clear. |
| **Indexing** | ✔ DONE | Indexes on Ad (userId, categoryId, status, createdAt, locationId, etc.), User (email, phone), OTP, ChatRoom, etc. |
| **Relations** | ✔ DONE | Prisma relations used correctly. |
| **Scalability** | ⚠ NEED IMPROVEMENT | Single DB (MongoDB). Redis optional for cache. Meilisearch optional for search (with DB fallback). No read replicas or sharding. |
| **Backup strategy** | ❌ MISSING | No backup/restore scripts or docs in repo. Rely on MongoDB Atlas/self-hosted backup. |

---

## 7. Admin & Moderation

| Area | Status | Notes |
|------|--------|--------|
| **Category management** | ✔ DONE | Admin routes for categories (and related). |
| **User control** | ✔ DONE | Admin dashboard, user list, deactivation, audit log (AuditLog model). |
| **Ad approval** | ✔ DONE | PENDING/APPROVED/REJECTED, moderation flow, content moderation (NSFWJS + optional Google Vision), auto-approval possible. |
| **Reports handling** | ❌ MISSING | No “report ad” or “report user” flow; no Report model or admin reports UI. |
| **Abuse prevention** | ⚠ NEED IMPROVEMENT | Block user, content moderation, **rate limiting (done)**. No dedicated report/flag pipeline. |

---

## 8. Testing & Deployment

| Area | Status | Notes |
|------|--------|--------|
| **Manual test checklist** | ⚠ NEED IMPROVEMENT | Deployment has CHECKLIST.md and docs; no single “pre-launch manual test” checklist in repo. |
| **Automated tests** | ❌ MISSING | No Jest/Vitest (or other) config, no `*.test.js`/`*.spec.ts` files. |
| **CI/CD** | ❌ MISSING | No `.github/workflows` or other CI (build, lint, test, deploy). |
| **Build process** | ✔ DONE | Backend: node start; Frontend: next build. deployment/ has deploy scripts and PM2 config. |
| **Env separation** | ⚠ NEED IMPROVEMENT | NODE_ENV used; dev/prod CORS and cookie secure. **Critical:** remove hardcoded DB URL and JWT secret from env.js. |

---

## Summary Table

| Section | DONE | NEED IMPROVEMENT | MISSING |
|--------|------|------------------|--------|
| 1. Core Functionality | 8 | 0 | 0 |
| 2. Code Quality & Architecture | 4 | 3 | 0 |
| 3. Performance | 6 | 0 | 0 |
| 4. Stability & Error Handling | 4 | 2 | 0 |
| 5. Security | 5 | 2 | 0 |
| 6. Database & Backend | 4 | 1 | 1 (backup) |
| 7. Admin & Moderation | 4 | 1 | 1 (reports) |
| 8. Testing & Deployment | 1 | 2 | 2 (tests, CI/CD) |

---

## Development Readiness Score: **72 / 100**

- **Strengths:** Core marketplace features (categories, ads, auth, chat, payments, **search**, filters, location), Prisma schema and indexes, Redis cache, **rate limiting**, **structured logging (pino + request ID)**, image validation, admin and moderation, Next.js + React Query.
- **Remaining gaps:** Hardcoded env fallbacks (security risk), no reports flow, no automated tests or CI/CD, no documented backup strategy.

---

## Top 10 Critical Fixes

1. **Remove hardcoded secrets and DB URL**  
   In `backend/src/config/env.js`, remove default `DATABASE_URL`, `MONGO_URI`, and `JWT_SECRET` (or use empty string and require env in production). Never commit real credentials.

2. **Add `.env.example`**  
   At repo root and/or backend: list all required/optional vars with dummy values (no real DB URL or JWT secret). Point deployment to this.

3. **Add “Report ad / Report user”**  
   Model (e.g. Report with type, targetId, reporterId, reason, status), API, and admin UI to list and act on reports.

4. **Document backup strategy**  
   How and how often DB (and any critical blobs) are backed up; how to restore. If using Atlas, document Atlas backup/restore.

5. **Add a minimal test suite**  
   At least: one smoke test for health or main ad list API, one auth test (e.g. login or verify-otp). Run in CI.

6. **Add CI (e.g. GitHub Actions)**  
   One workflow: install, lint, run tests, build frontend (and optionally backend). Build should be green.

7. **Harden error handling**  
   Ensure every route and service path that can throw uses try/catch and returns a consistent error shape; avoid leaking stack in production.

8. **XSS / rich text**  
   If ad description or other fields are ever rendered as HTML, add sanitization (e.g. DOMPurify or server-side sanitize) before storing or rendering.

9. **Pre-launch manual checklist**  
   Single doc: register, login, post ad, edit/delete, search, filters, chat, payment (test mode), admin approve ad, location filters, rate limit (429), request ID in response.

10. **HTTPS in production**  
    Ensure deployment (nginx/reverse proxy) enforces HTTPS and that `secure` cookie and `FRONTEND_URL` are set for production.

---

## MVP Launch Checklist

- [ ] Env: no hardcoded secrets; production uses env only; `.env.example` present.
- [x] Rate limiting on API and auth.
- [x] Search: full-text (Meilisearch + Prisma fallback) implemented.
- [ ] Reports: report ad/user + admin view (can be minimal for MVP).
- [ ] Error handling: no uncaught throws in main flows; 500 with generic message in prod.
- [x] Logging: structured (pino), request ID, no secrets in logs.
- [ ] HTTPS and secure cookies in production (handled by deployment).
- [ ] Backup: strategy documented and tested once.
- [ ] Manual pass: register, login, post ad, edit/delete, search, chat, payment (test mode), admin approve ad, location filters.
- [ ] Optional but recommended: at least 1–2 automated API tests and a CI job that runs them.

---

## Next 30-Day Dev Plan

| Week | Focus |
|------|--------|
| **Week 1** | Security & config: remove env fallbacks in env.js, add `.env.example`, review cookie/HTTPS. |
| **Week 2** | Reports: add Report model + API + admin list (report ad/user). |
| **Week 3** | Stability & ops: try/catch audit, backup doc (and one restore test), pre-launch manual checklist. |
| **Week 4** | Quality: 2–3 API tests (health, ads list, auth), ESLint/typecheck in CI, one GitHub Actions workflow. |

After 30 days you should have: no secrets in code, basic reporting, safer errors, backup doc, and a minimal automated test run in CI.

---

*End of audit. Language kept simple and practical; focus is development quality only.*
