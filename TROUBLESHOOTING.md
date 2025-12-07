# Connection Troubleshooting Guide

## Quick Checks

### 1. Backend Server Status
```bash
# Check if backend is running
curl http://localhost:5000/health

# Or in browser:
http://localhost:5000/health
```

**Expected Response:**
```json
{"status":"ok","timestamp":"..."}
```

### 2. Frontend Configuration

Make sure `frontend/.env.local` exists with:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Restart Frontend

After updating `.env.local`, restart the frontend:
```bash
cd frontend
npm run dev
```

### 4. Browser Console

Check browser console (F12) for errors:
- CORS errors
- Network errors
- API URL errors

### 5. Common Issues

#### "Unable to connect"
- **Backend not running**: Start with `cd backend && npm run dev`
- **Wrong port**: Check backend is on port 5000
- **Firewall**: Check Windows Firewall settings

#### CORS Errors
- Backend CORS is configured for `http://localhost:3000`
- Make sure frontend is running on port 3000
- Clear browser cache

#### API 404 Errors
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Make sure it ends with `/api`
- Restart frontend after changing `.env.local`

### 6. Test Connection

Open browser console and run:
```javascript
fetch('http://localhost:5000/api/locations')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

### 7. Restart Everything

1. Stop all Node processes
2. Start backend: `cd backend && npm run dev`
3. Wait 3-5 seconds
4. Start frontend: `cd frontend && npm run dev`
5. Open http://localhost:3000

### 8. Check Ports

```bash
# Check what's using port 5000
netstat -ano | findstr ":5000"

# Check what's using port 3000
netstat -ano | findstr ":3000"
```

