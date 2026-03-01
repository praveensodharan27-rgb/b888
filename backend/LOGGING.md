# Structured Logging

When a bug happens, you can trace it by **request ID** and **log level**.

## Request ID

- Every API request gets a unique `requestId` (e.g. `a1b2c3d4e5f6g7h8`).
- It is set in the `X-Request-Id` response header. Frontend can show it in error messages or send it to support.
- All logs for that request include `"requestId":"..."` so you can grep or filter by it.

## Log levels

- **error** – failures (auth, upload, DB, uncaught errors)
- **warn** – invalid token, missing config, fallbacks
- **info** – server start, upload success, cron actions
- **debug** – verbose (only in development unless `LOG_LEVEL=debug`)

Set level via env:

```bash
LOG_LEVEL=debug   # see debug logs
LOG_LEVEL=info    # default in production
LOG_LEVEL=warn    # only warnings and errors
```

## Output

- **Development:** Pretty-printed, human-readable (pino-pretty).
- **Production:** JSON lines, one object per line, for tools like Datadog, CloudWatch, ELK.

Example production line:

```json
{"level":30,"time":1707123456789,"env":"production","requestId":"a1b2c3d4","path":"/api/ads","method":"POST","msg":"Create ad error","err":"Category not found"}
```

## How to use in code

```js
const { logger } = require('./src/config/logger');

// Simple
logger.info('Server started');
logger.warn({ userId: '...' }, 'Invalid attempt');
logger.error({ err: error.message, requestId: req.id }, 'Upload failed');

// Request-scoped (use req.log set by pino-http)
req.log.info({ adId }, 'Ad approved');
req.log.error({ err }, 'Something failed');
```

Sensitive fields (`password`, `token`, `authorization`, `cookie`) are redacted from logs.
