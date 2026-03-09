# ⚡ Quick Start

## Single Command
```powershell
.\start-all.ps1
```

## Manual Start
```powershell
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

## Kill All Servers
```powershell
.\kill-all.ps1
```

## Health Check
```
http://localhost:5000/health
```

## Access App
```
http://localhost:3000
```

---

## Fixed Issues ✅

1. ✅ Port 5000 conflict - Auto-kills existing processes
2. ✅ Nodemon crashes - Stable restart mechanism
3. ✅ 500 errors - Proper error handling
4. ✅ Multiple processes - Clean startup/shutdown
5. ✅ Environment vars - Validated and documented

## Scripts Created

- `start-all.ps1` - Start both servers
- `kill-all.ps1` - Kill all dev processes
- `backend/start-backend-safe.ps1` - Safe backend start
- `backend/kill-port-5000.ps1` - Kill port 5000

## Files Modified

- ✅ `backend/package.json` - Fixed dev script
- ✅ `backend/src/server.js` - Added error handlers
- ✅ `backend/.env` - Validated (PORT=5000)
- ✅ `frontend/.env.local` - Validated (API URL)

---

See `PRODUCTION_SETUP.md` for detailed documentation.
