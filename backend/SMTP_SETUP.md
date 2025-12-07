# SMTP Email Configuration Guide

## Quick Setup for Email OTP

### Option 1: Gmail (Recommended for Development)

1. **Enable 2-Step Verification** on your Gmail account
2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "SellIt" as the name
   - Copy the 16-character password

3. **Add to `.env` file**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

### Option 2: Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Option 3: SendGrid (Production)

1. Sign up at https://sendgrid.com
2. Create API Key
3. Add to `.env`:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Option 4: Mailgun (Production)

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

## Development Mode

If SMTP is **not configured**, the system will:
- ✅ Log OTP codes to the backend console
- ✅ Allow registration to proceed
- ✅ Auto-verify users in development mode

**Check backend console for OTP codes when testing!**

## Testing

1. Add SMTP credentials to `backend/.env`
2. Restart backend server
3. Try registering with an email
4. Check email inbox (or backend console in dev mode)

## Troubleshooting

### Gmail Issues
- Make sure 2-Step Verification is enabled
- Use App Password, not regular password
- Check "Less secure app access" is enabled (if not using App Password)

### Connection Errors
- Check firewall settings
- Verify port 587 is not blocked
- Try port 465 with `SMTP_SECURE=true`

### Authentication Failed
- Double-check username and password
- For Gmail, ensure you're using App Password
- Check if account is locked/suspended

## Environment Variables

Add these to `backend/.env`:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# Optional
NODE_ENV=development
OTP_EXPIRES_IN=600  # OTP expiration in seconds (default: 10 minutes)
```

