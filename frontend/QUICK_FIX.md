# Quick Fix Guide

## CSS Parsing Errors? Run This:

```powershell
# Stop the dev server (Ctrl+C in terminal)

# Clear the cache
.\clear-build-cache.ps1

# Restart dev server
npm run dev
```

## Or manually:

```powershell
# Stop dev server (Ctrl+C)

# Clear cache
Remove-Item -Path ".next" -Recurse -Force

# Restart
npm run dev
```

## Why does this happen?

The `.next` folder contains compiled/cached files. Sometimes this cache gets corrupted, causing build errors even though your source code is fine.

## When to use this fix:

- ✅ CSS parsing errors
- ✅ "Module not found" errors that don't make sense
- ✅ Changes not appearing after editing files
- ✅ Random TypeScript errors that shouldn't exist
- ✅ Build working on another machine but not yours

## Prevention:

Add to `.gitignore` (already done):
```
.next/
node_modules/.cache/
```

Never commit these folders - they're machine-specific build artifacts.
