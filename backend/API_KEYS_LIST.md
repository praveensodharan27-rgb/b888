# Backend API Keys & Environment Variables List

**Location:** `backend/.env`  
**Important:** Never commit `.env` file to version control

---

## 🔴 Required (Critical)

These are essential for the backend to function:

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `DATABASE_URL` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` | MongoDB Atlas Dashboard |
| `JWT_SECRET` | Secret key for JWT tokens | `your-super-secret-key` | Generate: `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | JWT token expiration | `7d` | Default: `7d` |

---

## 💳 Payment Gateway - Razorpay

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `RAZORPAY_KEY_ID` | Razorpay Key ID | `rzp_test_xxxxxxxxxxxxx` | [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys) |
| `RAZORPAY_KEY_SECRET` | Razorpay Secret Key | `your_secret_key_here` | [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys) |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook secret for verification | `webhook_secret_here` | Razorpay Dashboard → Settings → Webhooks |
| `PAYMENT_GATEWAY_DEV_MODE` | Enable mock payments | `false` | Set to `true` for development |

**Get Keys:** https://dashboard.razorpay.com/app/keys

---

## 📧 Email Configuration (SMTP)

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` | Email provider settings |
| `SMTP_PORT` | SMTP server port | `587` | Email provider settings |
| `SMTP_SECURE` | Use TLS/SSL | `false` | Email provider settings |
| `SMTP_USER` | SMTP username/email | `your-email@gmail.com` | Your email account |
| `SMTP_PASS` | SMTP password/app password | `your-app-password` | Email provider app password |
| `SMTP_FROM` | From email address | `noreply@yourdomain.com` | Your domain email |

**Gmail Setup:** Use App Password (not regular password)

---

## 📱 SMS Configuration (Twilio - Optional)

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `ACxxxxxxxxxxxxx` | [Twilio Console](https://console.twilio.com/) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `your_auth_token` | [Twilio Console](https://console.twilio.com/) |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | `+1234567890` | [Twilio Console](https://console.twilio.com/) |

**Get Keys:** https://console.twilio.com/

---

## 🔐 OAuth - Google Login

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xxxxx.apps.googleusercontent.com` | [Google Cloud Console](https://console.cloud.google.com/) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `your_client_secret` | [Google Cloud Console](https://console.cloud.google.com/) |
| `GOOGLE_API_KEY` | Google API Key (optional) | `your_api_key` | [Google Cloud Console](https://console.cloud.google.com/) |
| `GOOGLE_MAPS_API_KEY` | Google Maps API Key | `your_maps_api_key` | [Google Cloud Console](https://console.cloud.google.com/) |

**Get Keys:** https://console.cloud.google.com/apis/credentials

---

## 🔐 OAuth - Facebook Login

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `FACEBOOK_APP_ID` | Facebook App ID | `1234567890123456` | [Facebook Developers](https://developers.facebook.com/) |
| `FACEBOOK_APP_SECRET` | Facebook App Secret | `your_app_secret` | [Facebook Developers](https://developers.facebook.com/) |

**Get Keys:** https://developers.facebook.com/apps/

---

## ☁️ File Storage - AWS S3

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key ID | `AKIAIOSFODNN7EXAMPLE` | [AWS IAM Console](https://console.aws.amazon.com/iam/) |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Access Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | [AWS IAM Console](https://console.aws.amazon.com/iam/) |
| `AWS_REGION` | AWS Region | `us-east-1` | AWS Console |
| `S3_BUCKET_NAME` | S3 Bucket Name | `your-bucket-name` | AWS S3 Console |
| `USE_CLOUDINARY` | Use Cloudinary instead | `false` | Set to `true` to use Cloudinary |

**Get Keys:** https://console.aws.amazon.com/iam/

---

## ☁️ File Storage - Cloudinary (Alternative)

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Cloud Name | `your-cloud-name` | [Cloudinary Dashboard](https://cloudinary.com/console) |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | `123456789012345` | [Cloudinary Dashboard](https://cloudinary.com/console) |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | `your_api_secret` | [Cloudinary Dashboard](https://cloudinary.com/console) |

**Get Keys:** https://cloudinary.com/console

---

## 🤖 AI Services

### OpenAI

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `OPENAI_API_KEY` | OpenAI API Key | `sk-proj-xxxxxxxxxxxxx` | [OpenAI Platform](https://platform.openai.com/api-keys) |

**Get Key:** https://platform.openai.com/api-keys

### Google Gemini

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `GEMINI_API_KEY` | Gemini API Key | `your_gemini_api_key` | [Google AI Studio](https://makersuite.google.com/app/apikey) |

**Get Key:** https://makersuite.google.com/app/apikey

### Google Vision

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `GOOGLE_VISION_API_KEY` | Google Vision API Key | `your_vision_api_key` | [Google Cloud Console](https://console.cloud.google.com/) |

**Get Key:** https://console.cloud.google.com/apis/library/vision.googleapis.com

---

## 🔍 Search Service - Meilisearch (Optional)

| Variable | Description | Example | Where to Get |
|----------|-------------|---------|--------------|
| `MEILISEARCH_HOST` | Meilisearch host URL | `http://localhost:7700` | Meilisearch server |
| `MEILISEARCH_MASTER_KEY` | Meilisearch master key | `your_master_key` | Meilisearch configuration |

**Setup:** Install Meilisearch locally or use cloud service

---

## ⚙️ Server Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `5000` | No |
| `HOST` | Server host | `0.0.0.0` | No |
| `FRONTEND_URL` | Frontend URL | `http://localhost:3000` | No |
| `BACKEND_URL` | Backend URL | `http://localhost:5000` | No |
| `SESSION_SECRET` | Session secret | Same as JWT_SECRET | No |

---

## 🔢 Application Settings

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FREE_ADS_LIMIT` | Free ads per user | `2` | No |
| `AD_POSTING_PRICE` | Price for posting ad | `49` | No |
| `PREMIUM_PRICE_TOP` | Premium TOP price | `299` | No |
| `PREMIUM_PRICE_FEATURED` | Premium FEATURED price | `199` | No |
| `PREMIUM_PRICE_BUMP_UP` | Premium BUMP_UP price | `99` | No |
| `PREMIUM_PRICE_URGENT` | Premium URGENT price | `49` | No |
| `PREMIUM_DURATION_TOP` | TOP duration (days) | `7` | No |
| `PREMIUM_DURATION_FEATURED` | FEATURED duration (days) | `14` | No |
| `PREMIUM_DURATION_BUMP_UP` | BUMP_UP duration (days) | `1` | No |
| `PREMIUM_DURATION_URGENT` | URGENT duration (days) | `7` | No |
| `REFERRAL_REWARD_AMOUNT` | Referral reward | `50` | No |
| `OTP_EXPIRY_MINUTES` | OTP expiration time | `10` | No |
| `OTP_LENGTH` | OTP code length | `6` | No |

---

## 📋 Complete `.env` Template

```env
# ============================================
# Server Configuration
# ============================================
NODE_ENV=development
PORT=5000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# ============================================
# Database (Required)
# ============================================
DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/database

# ============================================
# JWT & Security (Required)
# ============================================
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
SESSION_SECRET=your-session-secret-key

# ============================================
# Payment Gateway - Razorpay
# ============================================
PAYMENT_GATEWAY_DEV_MODE=false
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# ============================================
# Email Configuration (SMTP)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# ============================================
# SMS Configuration (Twilio - Optional)
# ============================================
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# ============================================
# OAuth - Google
# ============================================
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_API_KEY=your-google-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# ============================================
# OAuth - Facebook
# ============================================
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# ============================================
# File Storage - AWS S3
# ============================================
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name
USE_CLOUDINARY=false

# ============================================
# File Storage - Cloudinary (Alternative)
# ============================================
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# ============================================
# AI Services
# ============================================
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_VISION_API_KEY=your-google-vision-api-key

# ============================================
# Search Service (Meilisearch - Optional)
# ============================================
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_MASTER_KEY=your-meilisearch-master-key

# ============================================
# Application Settings
# ============================================
FREE_ADS_LIMIT=2
AD_POSTING_PRICE=49
PREMIUM_PRICE_TOP=299
PREMIUM_PRICE_FEATURED=199
PREMIUM_PRICE_BUMP_UP=99
PREMIUM_PRICE_URGENT=49
REFERRAL_REWARD_AMOUNT=50
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
```

---

## 🔑 Quick Reference by Priority

### 🔴 Critical (Must Have)
1. `DATABASE_URL` - Database connection
2. `JWT_SECRET` - Authentication
3. `RAZORPAY_KEY_ID` - Payment processing
4. `RAZORPAY_KEY_SECRET` - Payment processing

### 🟡 Important (Recommended)
5. `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - Email functionality
6. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google login
7. `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` - Facebook login

### 🟢 Optional (Nice to Have)
8. `OPENAI_API_KEY` - AI features
9. `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - File storage
10. `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` - SMS functionality
11. `MEILISEARCH_HOST`, `MEILISEARCH_MASTER_KEY` - Advanced search

---

## 🔗 Quick Links to Get Keys

- **Razorpay:** https://dashboard.razorpay.com/app/keys
- **Google Cloud:** https://console.cloud.google.com/apis/credentials
- **Facebook:** https://developers.facebook.com/apps/
- **OpenAI:** https://platform.openai.com/api-keys
- **AWS:** https://console.aws.amazon.com/iam/
- **Cloudinary:** https://cloudinary.com/console
- **Twilio:** https://console.twilio.com/

---

## 📚 Setup Guides

- **Razorpay:** `RAZORPAY_SETUP.md`, `RAZORPAY_KEY_SETUP.md`
- **Google OAuth:** `GOOGLE_OAUTH_QUICK_SETUP.md`, `OAUTH_SETUP.md`
- **OpenAI:** `OPENAI_SETUP.md`
- **Google Maps:** `GOOGLE_MAPS_SETUP.md`
- **SMTP:** `SMTP_SETUP.md`
- **Gemini:** `GEMINI_SETUP.md`

---

## ✅ Verification

Check if keys are configured:

```bash
# Check Razorpay
curl http://localhost:5000/api/payment-gateway/status

# Check environment variables
cd backend
# Windows PowerShell
Get-Content .env | Select-String "KEY"

# Linux/Mac
grep KEY .env
```

---

**Total API Keys:** 30+  
**Required:** 3-4  
**Recommended:** 7-10  
**Optional:** 20+

---

**Last Updated:** 2024


