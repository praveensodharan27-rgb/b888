# MongoDB URL Setup Guide

## Your MongoDB Connection URL

**Template:**
```
mongodb+srv://b888:<db_password>@cluster0.cj9oi8t.mongodb.net/
```

## Steps to Configure

### 1. Replace `<db_password>` with your actual MongoDB password

Your MongoDB URL should look like:
```
mongodb+srv://b888:YOUR_ACTUAL_PASSWORD@cluster0.cj9oi8t.mongodb.net/sellit?retryWrites=true&w=majority
```

### 2. Add Database Name

Add your database name after the last `/` (e.g., `sellit`):
```
mongodb+srv://b888:YOUR_PASSWORD@cluster0.cj9oi8t.mongodb.net/sellit
```

### 3. Add Connection Parameters (Recommended)

Add these parameters for better connection handling:
```
mongodb+srv://b888:YOUR_PASSWORD@cluster0.cj9oi8t.mongodb.net/sellit?retryWrites=true&w=majority&appName=SellIt
```

### 4. Update backend/.env file

Add or update the `DATABASE_URL` in `backend/.env`:

```env
DATABASE_URL=mongodb+srv://b888:YOUR_PASSWORD@cluster0.cj9oi8t.mongodb.net/sellit?retryWrites=true&w=majority&appName=SellIt
```

## Complete Example

If your password is `MyPassword123`, your URL would be:

```env
DATABASE_URL=mongodb+srv://b888:MyPassword123@cluster0.cj9oi8t.mongodb.net/sellit?retryWrites=true&w=majority&appName=SellIt
```

## Important Notes

1. **Password Encoding**: If your password contains special characters, URL-encode them:
   - `@` → `%40`
   - `#` → `%23`
   - `$` → `%24`
   - `%` → `%25`
   - `&` → `%26`
   - `+` → `%2B`
   - `=` → `%3D`

2. **Database Name**: Replace `sellit` with your actual database name if different

3. **Security**: Never commit your `.env` file to version control

## Test Connection

After updating, test the connection:

```bash
cd backend
node test-mongodb-connection.js
```

Or use the Prisma command:

```bash
cd backend
npx prisma db pull
```

## Troubleshooting

- **Connection timeout**: Check your IP is whitelisted in MongoDB Atlas
- **Authentication failed**: Verify username and password
- **Database not found**: The database will be created automatically on first use

