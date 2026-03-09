# SQL / NoSQL Injection Security Audit Report

**Audit date:** February 2025  
**Scope:** All database-related code in backend  
**Tech stack:** Node.js, **MongoDB**, **Prisma** (ORM) + native MongoClient in a few modules

---

## Executive Summary

The application uses **MongoDB** with **Prisma** for most data access and the **native MongoDB driver** (MongoClient) in a few places (reports, sponsored ads, categories spec config). **No raw SQL** is used in request-handling code; Prisma uses parameterized queries. One **MongoDB operator injection** risk was found and fixed in the reports API. Remaining items are low risk (scripts with static raw SQL, credential exposure in scripts) or already safe (Prisma where-building, attribute filters used only in JS).

---

## 1. Unsafe Query Construction (String Concatenation / Template Literals)

### Status: **PASS** (no unsafe concatenation in request paths)

| Location | Finding | Risk |
|----------|---------|------|
| All Prisma calls | `where`, `data` are object literals or variables built from validated input; no string concatenation into queries. | None |
| Native Mongo (reports, sponsoredAds, categories) | Queries built from objects (filter, query, where). No `"string" + userInput` or `` `...${userInput}` `` in query construction. | None |

**Verdict:** No string-concatenation or template-literal query building in request-handling code.

---

## 2. Parameterized Queries / Prepared Statements

### Status: **PASS**

- **Prisma:** All access uses the Prisma client; queries are parameterized by the driver.
- **MongoDB native (reports, sponsoredAdsService):** Queries use objects (e.g. `findOne({ reporterId, reportType, adId })`). After the fix below, `adId`/`targetUserId` are validated strings only, so no operator injection.

**Verdict:** No raw unparameterized queries in API routes.

---

## 3. Improper ORM Usage

### Status: **PASS**

- Prisma is used with explicit `where` and `data` objects; no passing of raw user payloads into `where` or `data` without mapping.
- Ad update uses an explicit field whitelist in `AdRepository.update()` (title, description, price, condition, status, etc.), so mass assignment is controlled.

**Verdict:** ORM usage is appropriate; no “pass req.body straight into Prisma” patterns.

---

## 4. Missing Input Validation / Sanitization

### Finding: **reports.js – adId / targetUserId (FIXED)**

| Item | Detail |
|------|--------|
| **File & line** | `backend/routes/reports.js` (previously ~59–62, ~73–75) |
| **Vulnerability type** | MongoDB operator injection via body parameters |
| **Risk level** | **High** |

**Issue:**  
`adId` and `targetUserId` were validated only as optional strings. If the client sent a JSON body with an object, e.g. `adId: { "$ne": null }`, that object was used in `findOne` and `insertOne`, allowing MongoDB operators to be injected.

**Exploit example:**
```http
POST /api/reports
Authorization: Bearer <valid-jwt>
Content-Type: application/json

{
  "reportType": "AD",
  "reason": "spam",
  "adId": { "$ne": null }
}
```
Result: `findOne({ reporterId, reportType, adId: { $ne: null }, ... })` could match any report with non-null adId, bypassing “already reported” checks.

**Fix applied:**  
- Ensure `adId` and `targetUserId` are **strings** and match a **24-character hex (ObjectId)** pattern.  
- Use only these validated strings in the query and in the inserted document.  
- Reject with 400 if format is invalid.

**Secure pattern (already in place after fix):**
```javascript
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const safeAdId = reportType === 'AD' && adId
  ? (typeof adId === 'string' && objectIdRegex.test(adId) ? adId : null)
  : null;
// Use safeAdId only in findOne and insertOne
```

**Recommendation:** For any MongoDB native API that accepts IDs or filter fields from the client, enforce type (string) and format (e.g. ObjectId regex) and never pass through objects that could contain `$` operators.

---

## 5. Dynamic Query Building Risks

### Status: **PASS** (with one fix applied)

| Code path | How query is built | Risk |
|-----------|---------------------|------|
| **AdService.getAds()** | `where` built from reserved keys; category/subcategory/location resolved via Prisma lookups (slug → id). `attributeFilters` from query string are used only in **in-memory** filter (attrsMatch), not in the MongoDB/Prisma `where` clause. | None |
| **reports GET /admin** | `filter` built from `status` and `reportType` only, both validated with `.isIn()`. | None |
| **sponsored-ads** | Query built from server-controlled structure (status, dates, location slugs). Location slug passed through `escapeRegex()` when used in RegExp. | None |
| **reports POST** | Previously used `adId`/`targetUserId` from body in query; now uses validated string IDs only. | Fixed |

**Verdict:** Dynamic query building is either server-controlled or validated; the only risky path (reports) has been fixed.

---

## 6. Raw SQL Queries Without Escaping

### Status: **N/A (MongoDB)** + **LOW (scripts only)**

- **API/routes:** No raw SQL; database is MongoDB.
- **Scripts:**  
  - `backend/scripts/add-deactivation-fields.js`, `fix-referral-code-nullable.js` use `prisma.$executeRawUnsafe()` with **static** SQL strings (no user input). Legacy PostgreSQL-style; not used in normal request flow.  
  - `backend/routes/system.js` uses `prisma.$queryRaw\`SELECT 1\`` (tagged template, no interpolation). Note: MongoDB Prisma may not support this; consider `$runCommandRaw({ ping: 1 })` for health checks.

**Recommendation:** Keep raw SQL only in scripts with static strings; do not introduce user input into `$executeRawUnsafe` or similar.

---

## 7. MongoDB Operator Injection ($ne, $gt, $where, etc.)

### Status: **PASS** (after reports fix)

| Location | Check | Result |
|----------|--------|--------|
| **reports.js** | adId/targetUserId in findOne/insertOne | **Fixed:** Only validated 24-char hex strings are used. |
| **reports GET /admin** | filter from query | Safe: only validated enum values. |
| **sponsoredAdsService** | findMany(where), findManyRaw(query) | Callers (sponsored-ads routes) build query from server logic; no user-supplied operators. |
| **categories.js** | getFilterOptionsFromConfig → Mongo findOne({ subcategoryId: subId }) | `subId` comes from Prisma subcategory lookup by slug, not from raw user input. Safe. |

**Verdict:** No remaining operator injection in request-handling code.

---

## 8. Mass Assignment Issues

### Status: **PASS**

| Location | Control | Result |
|----------|--------|--------|
| **AdRepository.update()** | Explicit field list (title, description, price, condition, status, categoryId, etc.). No `...req.body` in update. | Safe |
| **AdController createAd/updateAd** | Builds `adData` from explicit `req.body` fields; status for update restricted to INACTIVE/SOLD for non-admin. | Safe |
| **sponsoredAdsService.update(id, data)** | Callers (admin routes) should pass only whitelisted fields. Service does `$set: { ...data, updatedAt }`. If admin route sends only allowed keys, safe. | Acceptable (ensure admin API validates body). |

**Verdict:** Mass assignment is controlled; no unchecked spread of request body into Prisma/Mongo updates.

---

## 9. Privilege Escalation via Queries

### Status: **PASS**

- Authorization is enforced in middleware (`authenticate`, `authorize('ADMIN')`) and in service layer (e.g. AdService update/delete checks `existingAd.userId === userId`).
- Reports are scoped by `reporterId` (from JWT) and validated adId/targetUserId; admin list uses validated query params only.
- No query that could return or modify another user’s data without an ownership check was found.

**Verdict:** No privilege escalation via query manipulation identified.

---

## 10. Error-Based Injection Possibilities

### Status: **PASS**

- Prisma and MongoDB driver do not expose raw query or stack in production (per your error-handling hardening).
- No evidence of error messages being used to reflect DB structure or query content to the client in a way that would enable error-based injection.

**Verdict:** Error-based injection not in scope for current design.

---

## Additional Finding: Credential Exposure in Scripts (Not Injection)

| File | Issue | Risk |
|------|--------|------|
| `backend/scripts/update-mongodb-database.js`, `complete-mongodb-setup.js`, `setup-mongodb.js`, `fix-mongodb-connection.js`, `fix-mongodb-auth-now.js`, `complete-db-setup.js`, `quick-fix-mongodb-password.js`, `check-and-fix-url.js`, `fix-url-simple.js`, `ensure-mongodb-url.js`, `verify-mongodb-env.js` | Hardcoded MongoDB URIs or credentials in repo. | **Critical** (credential exposure) |

**Recommendation:** Remove all hardcoded credentials; use `process.env.DATABASE_URL` (or equivalent) only and ensure `.env` is gitignored. Rotate any credentials that were ever committed.

---

## Summary Table: Risky Locations

| # | File | Line(s) | Type | Risk | Status |
|---|------|---------|------|------|--------|
| 1 | reports.js | 59–62, 73–75 | MongoDB operator injection (adId/targetUserId) | High | **Fixed** |
| 2 | scripts (multiple) | various | Hardcoded DB credentials | Critical | Remediate (use env only) |
| 3 | system.js | 133, 170, 204 | $queryRaw\`SELECT 1\` (SQL) on MongoDB | Low (wrong DB type / may throw) | Prefer $runCommandRaw({ ping: 1 }) |
| 4 | add-deactivation-fields.js, fix-referral-code-nullable.js | 9–18, 9–31 | $executeRawUnsafe with static SQL | Low (no user input) | Acceptable for scripts |

---

## Best Practice Recommendations

1. **IDs from client:** Always validate that IDs are strings and match expected format (e.g. 24-char hex for MongoDB ObjectId) before using in any query or document. Never pass through objects that could contain `$` or other operators.
2. **Native MongoDB:** When using MongoClient, build filter objects from validated, typed values only. Avoid ever spreading or assigning `req.body`/`req.query` directly into a filter.
3. **Prisma:** Continue building `where` and `data` from explicit, validated fields. Do not pass unchecked query/body keys into dynamic where clauses.
4. **Raw/unsafe APIs:** Use `$executeRawUnsafe` / `queryRawUnsafe` only in scripts with static strings. Never interpolate user input.
5. **Health checks:** For MongoDB, use `prisma.$runCommandRaw({ ping: 1 })` instead of `$queryRaw\`SELECT 1\``.
6. **Secrets:** Remove all hardcoded URIs/passwords from scripts; use environment variables and rotate if credentials were ever committed.

---

## Secure Replacement / Pattern Reference

**MongoDB – safe use of client-supplied IDs:**
```javascript
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
function safeObjectIdString(value) {
  if (value == null) return null;
  if (typeof value !== 'string' || !objectIdRegex.test(value)) return null;
  return value;
}
// In route:
const adId = safeObjectIdString(req.body.adId);
if (req.body.adId != null && !adId) {
  return res.status(400).json({ success: false, message: 'Invalid adId format' });
}
// Use adId (string) in findOne/insertOne, not an object.
```

**Prisma – safe where from query params:**
```javascript
const allowedSort = ['newest', 'oldest', 'price_low'].includes(req.query.sort) ? req.query.sort : 'newest';
const where = { status: 'APPROVED' };
if (categorySlug) {
  const cat = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { id: true } });
  if (cat) where.categoryId = cat.id;
}
// Never: where[req.query.field] = req.query.value;
```

---

*End of SQL/NoSQL Injection Audit Report.*
