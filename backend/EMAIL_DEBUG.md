# Email Debugging Guide

## Quick Check

### 1. Check Backend Console
When you register, check the backend console window. You should see:
```
╔════════════════════════════════════════════════════╗
║   EMAIL OTP REQUEST                               ║
╠════════════════════════════════════════════════════╣
║   Email: your-email@example.com                   ║
║   OTP Code: 123456                                ║
║   Expires in: 10 minutes                          ║
╚════════════════════════════════════════════════════╝

📧 Checking SMTP configuration...
   SMTP_HOST: ✅ Set (or ❌ Not set)
   SMTP_USER: ✅ Set (or ❌ Not set)
   SMTP_PASS: ✅ Set (hidden) (or ❌ Not set)
   SMTP_PORT: 587 (default)
```

### 2. Test Email Endpoint
Test your SMTP configuration:
```bash
POST http://localhost:5000/api/test/test-email
Content-Type: application/json

{
  "email": "your-email@example.com"
}
```

Or use curl:
```bash
curl -X POST http://localhost:5000/api/test/test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

## Common Issues

### Issue 1: SMTP Not Configured
**Symptoms:**
- Console shows: `SMTP_HOST: ❌ Not set`
- Email not sent, but OTP logged to console

**Solution:**
1. Open `backend/.env` file
2. Add SMTP configuration:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```
3. **Restart backend server** (important!)

### Issue 2: Gmail Authentication Failed
**Symptoms:**
- Console shows: `❌ Email OTP sending failed!`
- Error: `Invalid login` or `Authentication failed`

**Solution:**
1. **Enable 2-Step Verification** on Gmail
2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Create app password for "Mail"
   - Use the 16-character password (not your regular password)
3. Update `.env` with the app password
4. Restart backend

### Issue 3: Connection Timeout
**Symptoms:**
- Error: `ETIMEDOUT` or `Connection timeout`

**Solution:**
1. Check firewall settings
2. Verify port 587 is not blocked
3. Try port 465 with `SMTP_SECURE=true`
4. Check if you're behind a corporate proxy

### Issue 4: Email Goes to Spam
**Symptoms:**
- Email sent successfully but in spam folder

**Solution:**
1. Check spam/junk folder
2. Add sender to contacts
3. For production, use proper email service (SendGrid, Mailgun)
4. Set up SPF/DKIM records

### Issue 5: Environment Variables Not Loading
**Symptoms:**
- SMTP shows as "Not set" even after adding to `.env`

**Solution:**
1. Make sure `.env` is in `backend/` directory
2. Restart backend server (nodemon should auto-restart)
3. Check for typos in variable names
4. Make sure no spaces around `=` sign
5. Don't use quotes around values (unless needed)

## Debugging Steps

### Step 1: Verify Configuration
Check backend console when registering. Look for:
- ✅ All SMTP variables set
- ✅ Connection verified
- ✅ Email sent successfully

### Step 2: Test Email Endpoint
Use the test endpoint to isolate the issue:
```bash
POST /api/test/test-email
```

### Step 3: Check Email Provider
- **Gmail**: Requires App Password (not regular password)
- **Outlook**: May need to enable "Less secure apps"
- **Custom SMTP**: Verify host, port, and credentials

### Step 4: Check Backend Logs
Look for detailed error messages in console:
- Connection errors
- Authentication errors
- Timeout errors
- Invalid credentials

## Development Mode

In development mode (`NODE_ENV=development`):
- ✅ OTP codes are **always logged** to console
- ✅ Registration proceeds even if email fails
- ✅ Users are auto-verified
- ✅ Check backend console for OTP codes

**You don't need SMTP configured for development!**

## Production Setup

For production, use a proper email service:

### SendGrid (Recommended)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

## Quick Fix Checklist

- [ ] SMTP variables added to `backend/.env`
- [ ] Backend server restarted
- [ ] Checked backend console for errors
- [ ] Tested with `/api/test/test-email` endpoint
- [ ] Verified email provider settings (Gmail App Password, etc.)
- [ ] Checked spam folder
- [ ] Verified firewall/network settings

## Still Not Working?

1. **Check backend console** - detailed logs show what's wrong
2. **Use test endpoint** - `/api/test/test-email` to isolate issue
3. **Verify .env file** - make sure variables are correct
4. **Restart server** - changes require restart
5. **Check email provider** - Gmail needs App Password, not regular password

