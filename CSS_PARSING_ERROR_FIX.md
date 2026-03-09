# CSS Parsing Error Fix

## Problem

The Next.js build was failing with a CSS parsing error:

```
Parsing CSS source code failed
  5485 |     background-color: var(--color-primary-600) !important;
  5486 |   }
> 5487 | .hover\:bg-blue-600:hoverbutton {
       |                     ^
  5488 |     background-color: var(--color-primary-500) !important;
  5489 |     color: var(--color-text-on-primary) !important;
  5490 |   }

'hoverbutton' is not recognized as a valid pseudo-class.
```

## Root Cause

This error was caused by a **corrupted build cache** in the `.next` directory. During a previous build, Tailwind's JIT compiler or PostCSS incorrectly concatenated the `:hover` pseudo-class with `button`, creating an invalid CSS selector `.hover\:bg-blue-600:hoverbutton`.

The error referenced line 5487, but the source `globals.css` file only has 764 lines, confirming this was a generated file issue, not a source code problem.

## Solution

Clear the Next.js build cache:

### Option 1: PowerShell Script (Recommended)

```powershell
cd frontend
.\clear-build-cache.ps1
```

### Option 2: Manual Cleanup

```powershell
# From the frontend directory
Remove-Item -Path ".next" -Recurse -Force
Remove-Item -Path "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue
```

### Option 3: npm Script

```bash
cd frontend
npm run clean  # if you have a clean script in package.json
```

## Prevention

If you encounter CSS parsing errors in the future:

1. **First**, try clearing the build cache (see solutions above)
2. **Second**, check for syntax errors in your source CSS files
3. **Third**, verify your Tailwind config is valid
4. **Last resort**, delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

## Verification

After clearing the cache, the dev server should start without errors:

```bash
cd frontend
npm run dev
```

Expected output:
```
✓ Starting...
✓ Compiled middleware in ~2s
✓ Ready in ~9s
```

## Related Files

- Source CSS: `frontend/app/globals.css` (764 lines - no errors)
- Tailwind Config: `frontend/tailwind.config.js` (valid)
- PostCSS Config: `frontend/postcss.config.js` (standard)
- Build Cache: `frontend/.next/` (cleared)

## Why the Error Appeared Multiple Times

The error repeated many times in the terminal because:

1. **Hot Module Replacement (HMR)**: Next.js was trying to recompile multiple routes/pages
2. **Cascading Failures**: Each route that imports `globals.css` failed with the same error
3. **Cached Build**: The corrupted CSS was in the `.next` build cache, so every compilation used the bad cached version

The error appeared for:
- `/` (home page)
- `/_error` (error page)
- Multiple other routes that import the global CSS

This is why you saw the same error message repeated 8+ times in the terminal output.

## Status

✅ **RESOLVED** - Build cache cleared, dev server running successfully on port 3002 (no CSS errors)
