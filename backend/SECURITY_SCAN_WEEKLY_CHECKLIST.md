# Weekly Security Scan – Checklist

Use this once a week (e.g. every Monday) to stay on top of injection and validation risks.

---

## 1. Run the scan

```bash
cd backend
npm run security-scan
```

---

## 2. Triage results

| Severity | Action |
|----------|--------|
| **CRITICAL** | Fix before merging; do not deploy. |
| **HIGH** | Fix before next release; block deploy if your policy requires. |
| **MEDIUM** | Plan a fix or confirm validation is done elsewhere; document if accepted. |
| **LOW** | Optional; clear when convenient. |

---

## 3. Common fixes

- **Raw unsafe query** → Remove `executeRawUnsafe`/`queryRawUnsafe` from routes/services, or use only static strings in scripts.
- **Mongo/query with req.body/query** → Validate IDs (e.g. 24-char hex); never pass `req.body`/`req.query` straight into filters.
- **Validation gap** → Add `express-validator` (`body()`, `query()`, `validationResult(req)`) for that route.

---

## 4. Log this run (optional)

- Date: _______________
- Findings: CRITICAL ___ HIGH ___ MEDIUM ___ LOW ___
- Actions taken: _______________

---

## 5. Optional: run in CI

Add to your CI (e.g. GitHub Actions) so every PR runs the scan and fails on CRITICAL/HIGH:

```yaml
- name: Security scan
  run: cd backend && npm run security-scan
```

See **SECURITY_SCAN_README.md** for full details and how to fix each finding type.
