# Quick Start Guide

## Prerequisites Setup

1. **PostgreSQL Database**
   ```bash
   # Create database
   createdb sellit
   ```

2. **Backend Environment**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database URL and other credentials
   ```

3. **Frontend Environment**
   ```bash
   cd frontend
   # Create .env.local file
   echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local
   echo "NEXT_PUBLIC_SOCKET_URL=http://localhost:5000" >> .env.local
   ```

## Database Setup

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

## Run the Application

### Terminal 1 - Backend Server
```bash
cd backend
npm run dev
```
Backend will run on http://localhost:5000

### Terminal 2 - Frontend Server
```bash
cd frontend
npm run dev
```
Frontend will run on http://localhost:3000

## First Steps

1. Open http://localhost:3000
2. Register a new account
3. Verify OTP
4. Post your first ad!

## Create Admin User

After registering, update a user to admin in database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

Then login and access /admin panel.

## Required Environment Variables

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET` - For payments
- `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY` - For S3 (or use Cloudinary)
- `SMTP_USER` & `SMTP_PASS` - For email OTP

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_SOCKET_URL` - WebSocket server URL

## Troubleshooting

1. **Database connection error**: Check DATABASE_URL in backend/.env
2. **Image upload fails**: Configure AWS S3 or Cloudinary credentials
3. **OTP not sending**: Configure SMTP or Twilio credentials
4. **Payment not working**: Add Razorpay keys in backend/.env

