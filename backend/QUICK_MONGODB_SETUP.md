# Quick MongoDB URL Setup

## Your MongoDB Connection URL Template

```
mongodb+srv://b888:<db_password>@cluster0.cj9oi8t.mongodb.net/
```

## Quick Setup Steps

### Option 1: Use the Setup Script (Recommended)

Run this PowerShell script:

```powershell
cd backend
.\setup-mongodb-url.ps1
```

The script will:
- Prompt you for your MongoDB password
- Create/update the `.env` file
- Set up the `DATABASE_URL` correctly

### Option 2: Manual Setup

1. **Create or edit `backend/.env` file**

2. **Add this line** (replace `YOUR_PASSWORD` with your actual password):

```env
DATABASE_URL=mongodb+srv://b888:YOUR_PASSWORD@cluster0.cj9oi8t.mongodb.net/sellit?retryWrites=true&w=majority&appName=SellIt
```

**Important:** 
- Replace `YOUR_PASSWORD` with your actual MongoDB password
- Replace `sellit` with your database name if different
- If your password has special characters, they need to be URL-encoded:
  - `@` → `%40`
  - `#` → `%23`
  - `$` → `%24`
  - `%` → `%25`
  - `&` → `%26`
  - `+` → `%2B`
  - `=` → `%3D`

### Example

If your password is `MyPass@123`, the URL would be:

```env
DATABASE_URL=mongodb+srv://b888:MyPass%40123@cluster0.cj9oi8t.mongodb.net/sellit?retryWrites=true&w=majority&appName=SellIt
```

## Test Connection

After setting up, test the connection:

```bash
cd backend
node test-mongodb-connection.js
```

## Verify Setup

Check if the URL is set correctly:

```bash
cd backend
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Not set ✗');"
```

## Next Steps

1. ✅ Set up MongoDB URL in `.env`
2. ✅ Whitelist your IP in MongoDB Atlas
3. ✅ Test connection
4. ✅ Generate Prisma client: `npm run prisma:generate`
5. ✅ Start server: `npm run dev`

## Troubleshooting

- **Connection timeout**: Add your IP to MongoDB Atlas Network Access
- **Authentication failed**: Double-check username and password
- **Database not found**: Database will be created automatically on first use

