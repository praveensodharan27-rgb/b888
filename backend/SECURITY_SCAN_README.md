# Weekly Code Security Monitor

Re-scan the backend **weekly** for injection risks, unsafe queries, and validation gaps.

---

## Run the scan

From the **backend** directory:

```bash
npm run security-scan
```

- Prints a report to stdout.
- Exit code **1** if any **CRITICAL** or **HIGH** finding (so CI can fail).
- Exit code **0** if only MEDIUM/LOW or none (MEDIUM are advisory; fix when possible).

---

## What it checks

| Category | What it looks for |
|----------|-------------------|
| **Injection** | Raw `executeRawUnsafe` / `queryRawUnsafe` with variable interpolation; Mongo `find`/`updateOne`/`insertOne` with `req.body`/`req.query` in the same block without validation; `$where` or `new RegExp(req.*)`; spread of `req.body`/`req.query` into `where`/`filter`/`data`; `eval`/`Function` with request input. |
| **Unsafe query** | `executeRawUnsafe` / `queryRawUnsafe` in routes or services (not in `scripts/`). |
| **Validation gap** | Route files that use `req.body`/`req.query` in POST/PUT/PATCH but don’t use `validationResult` or express-validator in the same file. |

Scanned paths: `routes/`, `src/`, `middleware/`, `services/`, `src/presentation/routes/`.  
Scripts under `scripts/` are treated as lower risk (e.g. raw SQL with static strings is acceptable there).

---

## How to fix common findings

### 1. “Raw query with possible variable interpolation”

- **Do not** build SQL/NoSQL by concatenating or interpolating user input.
- Use Prisma with object `where`/`data`, or parameterized APIs only.
- If you must use raw, use Prisma’s tagged template (e.g. `` prisma.$queryRaw`SELECT * FROM t WHERE id = ${id}` `` only when `id` is validated; avoid `$executeRawUnsafe` with string concatenation).

### 2. “Mongo find/update/insert may use unvalidated request input”

- Never pass `req.body` or `req.query` directly into a Mongo filter or document.
- For IDs: validate format (e.g. 24-char hex for ObjectId) and type (string); then use that validated value.
- Example: see `routes/reports.js` (safe use of `adId`/`targetUserId` after validation).

### 3. “Request body/query spread into query object”

- Do not do: `where = { ...req.query }` or `data = { ...req.body }`.
- Build `where`/`data` from explicit, allowlisted fields and validated values only.

### 4. “$where or RegExp may include user input”

- Avoid `$where` with user input.
- For `RegExp`, use a sanitizer (e.g. `escapeRegex`) and, if possible, allowlisted patterns.

### 5. “Route uses req.body/req.query; ensure express-validator is used”

- Add validators for every route that uses `req.body` or `req.query`.
- Use `body()`, `query()`, `param()` and then `validationResult(req)` before using the values.

---

## Weekly workflow

1. **Run once a week** (e.g. every Monday):
   ```bash
   cd backend && npm run security-scan
   ```
2. **Fix all CRITICAL and HIGH** before merging to main or deploying.
3. **Triage MEDIUM/LOW**: fix or document accepted risk in code or in this README.
4. **Optional**: add to CI so `npm run security-scan` runs on every PR and fails on CRITICAL/HIGH.

---

## Adding the scan to CI (GitHub Actions)

Example step:

```yaml
- name: Security scan
  run: cd backend && npm run security-scan
```

If the scan exits with 1, the job fails. Fix findings or adjust the script’s rules (e.g. in `scripts/security-scan.js`) and document why.

---

## Alert summary

After each run, check:

- **CRITICAL** → Fix immediately; do not deploy with these.
- **HIGH** → Fix before next release; block deploy if policy requires.
- **MEDIUM** → Plan a fix or document an exception.
- **LOW** → Optional fix; good to clear over time.

For any new route or service that touches the database or request input, re-run the scan and fix new findings.
