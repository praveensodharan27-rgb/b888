# Quick Start Servers - Troubleshooting

## If servers aren't running, follow these steps:

### Step 1: Check MongoDB Connection in .env

Open `backend/.env` and make sure it has:

```env
DATABASE_URL=mongodb+srv://b888:Ponkunnam1133!@cluster0.zfcaepv.mongodb.net/?appName=Cluster0
MONGO_URI=mongodb+srv://b888:Ponkunnam1133!@cluster0.zfcaepv.mongodb.net/?appName=Cluster0
```

### Step 2: Start Backend Server

Open a new terminal/PowerShell window:

```powershell
cd d:\sellit\backend
npm run dev
```

**Wait for:** "Server running on port 5000"

### Step 3: Start Frontend Server

Open another new terminal/PowerShell window:

```powershell
cd d:\sellit\frontend
npm run dev
```

**Wait for:** "Ready on http://localhost:3000"

### Step 4: Verify Servers

- Backend: http://localhost:5000/api/health
- Frontend: http://localhost:3000

## Common Issues

### Port Already in Use
```powershell
# Kill processes on ports 3000 and 5000
netstat -ano | findstr ":3000"
netstat -ano | findstr ":5000"
# Then use taskkill /PID <pid> /F
```

### MongoDB Connection Errors
- Make sure `.env` has the correct MongoDB connection string
- Restart the backend server after updating `.env`

### Frontend Won't Start
- Make sure you're in the `frontend` directory
- Run `npm install` if you see module errors

## Quick Commands

**Start both servers (PowerShell):**
```powershell
cd d:\sellit
.\start-all-servers.ps1
```

**Or manually:**
```powershell
# Terminal 1 - Backend
cd d:\sellit\backend
npm run dev

# Terminal 2 - Frontend  
cd d:\sellit\frontend
npm run dev
```
