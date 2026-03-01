#!/usr/bin/env node
/**
 * Weekly Code Security Monitor
 * Scans for: injection risks, unsafe queries, validation gaps.
 * Run: npm run security-scan   or   node scripts/security-scan.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['routes', 'src', 'middleware', 'services'];
const IGNORE = ['node_modules', '.git', 'uploads', 'coverage'];
const EXT = ['.js'];

const findings = [];
let filesScanned = 0;

function shouldIgnore(dirName) {
  return IGNORE.some((x) => dirName === x || dirName.startsWith('.'));
}

function* walk(dir, base = '') {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = path.join(base, e.name);
    if (e.isDirectory()) {
      if (shouldIgnore(e.name)) continue;
      yield* walk(path.join(dir, e.name), rel);
    } else if (e.isFile() && EXT.some((x) => e.name.endsWith(x))) {
      yield path.join(dir, e.name);
    }
  }
}

function relPath(abs) {
  return path.relative(ROOT, abs);
}

function add(severity, category, file, lineNum, message, suggestion) {
  findings.push({
    severity,
    category,
    file: relPath(file),
    line: lineNum,
    message,
    suggestion: suggestion || '',
  });
}

// --- Injection risks (narrow patterns to avoid false positives) ---
// Only flag raw *Unsafe* when the call argument contains interpolation/concat
const RAW_UNSAFE_CALL = /\$?(executeRawUnsafe|queryRawUnsafe)\s*\(\s*[^)]*[\$\+]/;
// Flag $queryRaw / $executeRaw with template literal that has ${ (variable)
const RAW_TAGGED_VAR = /prisma\.\$?(queryRaw|executeRaw)\s*`[^`]*\$\{/;
const MONGO_OP_INJECT = /(\.findOne?|\.find)\s*\(\s*[^)]*req\.(body|query|params)|(updateOne|insertOne|deleteOne)\s*\(\s*[^)]*\.\.\.\s*req\.(body|query)/;
const WHERE_REGEX_USER = /\$where\s*[:=]\s*.*req\.|new RegExp\s*\(\s*[^)]*req\.(body|query|params)/;
const CONCAT_IN_QUERY = /(where|data|filter)\s*[:=]\s*\{[^}]*\.\.\.\s*req\.(body|query)/;

// --- Validation gaps (routes only) ---
const ROUTER_METHOD = /router\.(get|post|put|patch|delete)\s*\(\s*['"`][^'"`]+['"`]\s*,/;
const HAS_BODY_QUERY = /req\.(body|query|params)\./;
const VALIDATION_RESULT = /validationResult\s*\(req\)|errors\.isEmpty|\.isIn\(|\.isString\(|\.isEmail\(|\.isInt\(|\.optional\(/;

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  filesScanned++;

  const isRoute = filePath.includes(path.sep + 'routes' + path.sep) || filePath.includes(path.sep + 'src' + path.sep + 'presentation' + path.sep);
  const isScript = filePath.includes(path.sep + 'scripts' + path.sep);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // 1) Raw unsafe with interpolation (critical in request-handling code)
    if (!isScript && RAW_UNSAFE_CALL.test(line)) {
      add(
        'CRITICAL',
        'Injection',
        filePath,
        lineNum,
        'Raw unsafe query (executeRawUnsafe/queryRawUnsafe) with possible interpolation',
        'Use parameterized queries only; never interpolate user input into raw SQL/NoSQL.'
      );
    }
    if (!isScript && RAW_TAGGED_VAR.test(line)) {
      add(
        'HIGH',
        'Unsafe query',
        filePath,
        lineNum,
        'Raw tagged query ($queryRaw/$executeRaw) with template variable',
        'Ensure the variable is validated (e.g. allowlisted); prefer Prisma where/data objects.'
      );
    }

    // 2) executeRawUnsafe / queryRawUnsafe in routes or services (not scripts) - any use is risky
    if (!isScript && /executeRawUnsafe|queryRawUnsafe/.test(line) && !RAW_UNSAFE_CALL.test(line)) {
      add(
        'HIGH',
        'Unsafe query',
        filePath,
        lineNum,
        'Raw unsafe query in request path',
        'Move to scripts with static strings only, or use parameterized Prisma APIs.'
      );
    }

    // 3) MongoDB native with req.body/query in same line or next
    if (/\.(findOne?|find)\s*\(|\.(updateOne|insertOne|deleteOne)\s*\(/.test(line)) {
      const nextFew = lines.slice(i, Math.min(i + 3, lines.length)).join(' ');
      if (/req\.(body|query|params)\.[a-zA-Z0-9_]*\s*[,\}]|\.\.\.\s*req\.(body|query)/.test(nextFew) && !/ObjectId\.isValid|objectIdRegex|typeof\s+\w+\s*===?\s*['"]string['"]/.test(nextFew)) {
        add(
          'HIGH',
          'Injection',
          filePath,
          lineNum,
          'Mongo find/update/insert may use unvalidated request input',
          'Validate and sanitize IDs (e.g. 24-char hex for ObjectId); never pass req.body/query directly into filter.'
        );
      }
    }

    // 4) $where or RegExp built from user input
    if (/\$where|new RegExp\s*\(/.test(line) && /req\.(body|query|params)|req\.headers/.test(line)) {
      add(
        'HIGH',
        'Injection',
        filePath,
        lineNum,
        '$where or RegExp may include user input',
        'Avoid $where; for RegExp use escapeRegex() and allowlist patterns.'
      );
    }

    // 5) Spread req.body/query into where/filter/data
    if (CONCAT_IN_QUERY.test(line)) {
      add(
        'HIGH',
        'Mass assignment / Injection',
        filePath,
        lineNum,
        'Request body/query spread into query object',
        'Build where/data from explicit, validated fields only.'
      );
    }

    // 6) eval( or Function( with user input
    if (/\beval\s*\(|new Function\s*\(/.test(line) && /req\.|process\.env\./.test(line)) {
      add(
        'CRITICAL',
        'Injection',
        filePath,
        lineNum,
        'eval/Function with request or env input',
        'Remove eval/Function; use safe parsing or allowlisted logic.'
      );
    }
  }

  // Validation gap: route file with req.body/query but no validation in first 80 lines of a handler
  if (isRoute && HAS_BODY_QUERY.test(content)) {
    const hasValidation = VALIDATION_RESULT.test(content) || /express-validator|body\(|query\(/.test(content);
    if (!hasValidation && /router\.(post|put|patch)\s*\(/.test(content)) {
      const firstBody = content.indexOf('req.body');
      const firstQuery = content.indexOf('req.query');
      const firstValidation = content.indexOf('validationResult');
      if ((firstBody >= 0 || firstQuery >= 0) && (firstValidation < 0 || firstValidation > Math.max(firstBody, firstQuery) + 500)) {
        add(
          'MEDIUM',
          'Validation gap',
          filePath,
          null,
          'Route uses req.body/req.query; ensure express-validator or equivalent is used',
          'Add body()/query() validators and validationResult(req) before using input.'
        );
      }
    }
  }
}

// Run scan
for (const dir of SCAN_DIRS) {
  const absDir = path.join(ROOT, dir);
  if (!fs.existsSync(absDir)) continue;
  for (const file of walk(absDir)) {
    scanFile(file);
  }
}

// Also scan routes that might be in src/presentation
const routesDir = path.join(ROOT, 'src', 'presentation', 'routes');
if (fs.existsSync(routesDir)) {
  for (const file of walk(routesDir)) {
    scanFile(file);
  }
}

// Dedupe by file+line+category
const seen = new Set();
const unique = findings.filter((f) => {
  const key = `${f.file}:${f.line}:${f.category}:${f.message}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

// Report
const bySeverity = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] };
unique.forEach((f) => {
  if (bySeverity[f.severity]) bySeverity[f.severity].push(f);
});

const out = [];
out.push('');
out.push('═══════════════════════════════════════════════════════════════');
out.push('  WEEKLY SECURITY SCAN – Injection | Unsafe queries | Validation');
out.push('═══════════════════════════════════════════════════════════════');
out.push(`  Scanned: ${filesScanned} files in ${SCAN_DIRS.join(', ')}`);
out.push(`  Findings: ${unique.length} total`);
out.push('');

for (const sev of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
  const list = bySeverity[sev];
  if (!list || list.length === 0) continue;
  out.push(`--- ${sev} (${list.length}) ---`);
  list.forEach((f) => {
    out.push(`  ${f.file}:${f.line || '?'}  [${f.category}] ${f.message}`);
    if (f.suggestion) out.push(`    → ${f.suggestion}`);
  });
  out.push('');
}

out.push('═══════════════════════════════════════════════════════════════');
out.push('  Run weekly:  npm run security-scan');
out.push('  Fix any CRITICAL/HIGH before deploy. See SECURITY_SCAN_README.md');
out.push('═══════════════════════════════════════════════════════════════');
out.push('');

console.log(out.join('\n'));

// Exit with error if critical/high so CI can fail
const hasCritical = (bySeverity.CRITICAL && bySeverity.CRITICAL.length > 0);
const hasHigh = (bySeverity.HIGH && bySeverity.HIGH.length > 0);
if (hasCritical || hasHigh) {
  process.exit(1);
}
