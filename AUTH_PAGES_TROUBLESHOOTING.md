# 🔧 Auth Pages Editor - Troubleshooting

## ❌ "Failed to update settings" Error

Here's how to debug and fix the issue:

---

## 🔍 Step 1: Check Browser Console

### Open Developer Tools:
```
1. Press F12 in your browser
2. Go to Console tab
3. Try saving changes in Auth Pages editor
4. Look for error messages
```

### What to Look For:
- ❌ Network errors (401, 403, 500)
- ❌ CORS errors
- ❌ API endpoint errors
- ❌ Validation errors

---

## 🔍 Step 2: Check Backend Console

### Look at Backend Terminal:
```
1. Find the backend server terminal window
2. Watch for logs when you click "Save"
3. Look for error messages
```

### Expected Logs:
```
✅ Updating login page settings: { title: '...', ... }
✅ Update data prepared: { ... }
✅ Settings updated successfully: { ... }
```

### If You See Errors:
- Database connection issues
- Prisma client issues
- Permission errors

---

## 🔧 Common Fixes:

### Fix 1: Regenerate Prisma Client
```powershell
cd D:\sellit\backend
npx prisma generate
node scripts/seed-auth-settings.js
```

### Fix 2: Check Database Connection
```powershell
cd D:\sellit\backend
npx prisma db push
```

### Fix 3: Verify API Route is Registered
Check backend console for:
```
✅ Auth settings routes registered at /api/auth-settings
```

### Fix 4: Restart Servers
```powershell
cd D:\sellit
.\restart-all-servers.ps1
```

---

## 🧪 Test API Directly:

### Test GET endpoint:
```
Open in browser:
http://localhost:5000/api/auth-settings/login
```

**Expected Response:**
```json
{
  "success": true,
  "settings": {
    "page": "login",
    "title": "SellIt.",
    "subtitle": "...",
    ...
  }
}
```

### Test with Postman/Thunder Client:
```
PUT http://localhost:5000/api/auth-settings/login
Authorization: Bearer YOUR_TOKEN
Body: {
  "title": "Test",
  "subtitle": "Test subtitle"
}
```

---

## 🔍 Debug Checklist:

### Backend:
- [ ] ✅ Backend server running (port 5000)?
- [ ] ✅ Auth settings route registered?
- [ ] ✅ Database table exists?
- [ ] ✅ Prisma client generated?
- [ ] ✅ Default data seeded?

### Frontend:
- [ ] ✅ Frontend compiled successfully?
- [ ] ✅ Logged in as admin?
- [ ] ✅ Form fields have values?
- [ ] ✅ No console errors?

### Network:
- [ ] ✅ No CORS errors?
- [ ] ✅ API endpoint accessible?
- [ ] ✅ Authentication token valid?

---

## 🛠️ Quick Fix Script:

Run this to fix most issues:

```powershell
# Stop all servers
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Navigate to backend
cd D:\sellit\backend

# Regenerate Prisma
npx prisma generate

# Push schema to database
npx prisma db push --skip-generate

# Seed auth settings
node scripts/seed-auth-settings.js

# Go back and restart
cd ..
.\start-all-servers.ps1
```

---

## 📊 Check Database Table:

### Verify table exists:
```sql
SELECT * FROM "AuthPageSettings";
```

**Should show:**
- Row with page='login'
- Row with page='signup'

---

## 🔍 Console Debugging:

### In Browser Console, Check:
```javascript
// Check if data is loaded
console.log('Login data:', loginData);
console.log('Signup data:', signupData);
console.log('Form data:', formData);

// Check API endpoint
fetch('http://localhost:5000/api/auth-settings/login')
  .then(r => r.json())
  .then(console.log);
```

---

## 💡 Most Common Issues:

### Issue 1: Prisma Client Not Generated
**Solution:**
```powershell
cd backend
npx prisma generate
```

### Issue 2: Database Table Missing
**Solution:**
```powershell
cd backend
npx prisma db push
node scripts/seed-auth-settings.js
```

### Issue 3: Not Logged In as Admin
**Solution:**
- Log out
- Log in with admin credentials
- Try again

### Issue 4: API Route Not Registered
**Check** `backend/server.js` has:
```javascript
app.use('/api/auth-settings', authSettingsRoutes);
```

---

## 🔄 Full Reset:

If nothing works, do a complete reset:

```powershell
# 1. Stop servers
cd D:\sellit
Stop-Process -Name node -Force

# 2. Backend setup
cd backend
npx prisma generate
npx prisma db push
node scripts/seed-auth-settings.js

# 3. Restart everything
cd ..
.\start-all-servers.ps1

# 4. Wait 15 seconds then test
```

---

## 🧪 Test After Fix:

1. **Go to**: http://localhost:5000/api/auth-settings/login
2. **Should see**: JSON with settings ✅
3. **Go to**: http://localhost:3000/admin?tab=auth-pages
4. **Edit**: Change title to "TestStore."
5. **Save**: Click "Save Changes"
6. **Should see**: "Login page updated successfully!" ✅

---

## 📞 Get More Help:

### Check Logs:
1. Backend console - Error messages
2. Browser console (F12) - Network tab
3. Look for specific error codes

### Common Error Codes:
- **401**: Not authenticated - Log in again
- **403**: Not authorized - Need admin role
- **404**: Route not found - Check server.js
- **500**: Server error - Check backend logs

---

## 🎯 Quick Diagnostic:

Run this command to check everything:
```powershell
cd D:\sellit\backend
node -e "const {PrismaClient} = require('@prisma/client'); const prisma = new PrismaClient(); prisma.authPageSettings.findMany().then(console.log).finally(() => prisma.$disconnect());"
```

**Should show:** Both login and signup settings

---

**Try the fixes above and the error should be resolved!** 🔧✨

