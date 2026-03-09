# Frontend Server Management Guide

## ⚠️ IMPORTANT: Use Webpack, NOT Turbopack!

There's a CSS parsing bug in **Turbopack** (Next.js 15.5.12) that causes this error:
```
Error: Parsing CSS source code failed
.hover\:bg-blue-600:hoverbutton
```

**Solution**: Always use **Webpack** instead of Turbopack.

## 🚀 How to Start the Frontend

### ✅ Correct Way (Webpack):
```bash
npm run dev:webpack
```

Or use the helper script:
```bash
# Windows Batch
start-frontend.bat

# PowerShell
.\start-frontend.ps1
```

### ❌ Wrong Way (Turbopack - Has Bugs):
```bash
npm run dev  # DON'T USE THIS - it uses Turbopack
```

## 🔧 Available Scripts

- `npm run dev:webpack` - ✅ Start with Webpack (USE THIS)
- `npm run dev` - ❌ Start with Turbopack (HAS CSS BUG)
- `npm run build` - Build for production
- `npm run start` - Start production server

## 🐛 Troubleshooting

### CSS Parsing Error (hoverbutton)
**Error Message:**
```
Parsing CSS source code failed
.hover\:bg-blue-600:hoverbutton
'hoverbutton' is not recognized as a valid pseudo-class
```

**Cause**: You're using Turbopack (`npm run dev`)

**Solution**: 
1. Stop the server (Ctrl+C)
2. Start with Webpack: `npm run dev:webpack`

### Port 3000 Already in Use
**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /F /PID <PID>

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

## 📊 Current Setup

- **Port**: 3000
- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:3000
- **Build Tool**: Webpack (Turbopack disabled due to bugs)

## 🎯 What We Fixed

1. **Removed `modularizeImports`** from `next.config.js` (was causing module resolution issues)
2. **Using Webpack instead of Turbopack** (Turbopack has CSS parsing bug)
3. **Added hover states** to button CSS rules in `globals.css`

## ✅ Verification

When the frontend starts successfully, you should see:
```
✓ Ready in 10-15s
- Local:        http://localhost:3000
- Network:      http://0.0.0.0:3000
```

**No CSS errors!** ✅

## 📝 Important Notes

- The warning about `experimental.turbo` is safe to ignore
- We're using Webpack which is stable and works perfectly
- Turbopack will be fixed in future Next.js versions
- For now, always use `npm run dev:webpack`

## 🚀 Quick Start

1. Make sure backend is running on port 5000
2. Run: `npm run dev:webpack`
3. Open: http://localhost:3000
4. Done! ✨
