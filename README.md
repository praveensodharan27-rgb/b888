# SellIt - OLX-like Classifieds Website

A complete classifieds marketplace built with Next.js, Express, PostgreSQL, and Prisma.

## Features

- ✅ User Authentication (Email/Phone + OTP)
- ✅ Post Ads with up to 12 images
- ✅ Category & Subcategory system
- ✅ Location-based listings
- ✅ Advanced Search, Filters & Sorting
- ✅ Real-time Chat System (WebSocket)
- ✅ Favorites/Wishlist
- ✅ Premium Ads (Top, Featured, Bump Up)
- ✅ Banner Ads Management
- ✅ Admin Panel with approval system
- ✅ Razorpay Payment Integration
- ✅ Image Upload (AWS S3 / Cloudinary)
- ✅ Notifications System
- ✅ Mobile Responsive UI
- ✅ SEO Optimized

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Query
- Socket.IO Client
- React Hook Form

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL
- Socket.IO (WebSocket)
- JWT Authentication
- Razorpay Integration
- AWS S3 / Cloudinary

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- AWS S3 account (or Cloudinary)
- Razorpay account (for payments)
- SMTP server (for email OTP) or Twilio (for SMS OTP)

## Setup Instructions

### 1. Clone and Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb sellit

# Copy environment file
cd backend
cp .env.example .env

# Edit .env and add your database URL:
# DATABASE_URL="postgresql://user:password@localhost:5432/sellit?schema=public"

# Run migrations
npm run prisma:generate
npm run prisma:migrate
```

### 3. Backend Configuration

Edit `backend/.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sellit?schema=public"

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# OTP
OTP_SECRET=your-otp-secret
OTP_EXPIRES_IN=600

# AWS S3 (or use Cloudinary)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket
USE_CLOUDINARY=false

# OR Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
USE_CLOUDINARY=true

# Razorpay
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret

# Email (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS (Optional - Twilio)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=your-number

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. Frontend Configuration

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login with password
- `POST /api/auth/login-otp` - Login with OTP
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `GET /api/auth/me` - Get current user

### Ads
- `GET /api/ads` - Get all ads (with filters)
- `GET /api/ads/:id` - Get single ad
- `POST /api/ads` - Create ad
- `PUT /api/ads/:id` - Update ad
- `DELETE /api/ads/:id` - Delete ad
- `POST /api/ads/:id/favorite` - Toggle favorite

### Premium
- `POST /api/premium/order` - Create premium order
- `POST /api/premium/verify` - Verify payment

### Chat
- `GET /api/chat/rooms` - Get chat rooms
- `POST /api/chat/room` - Create/get room
- `GET /api/chat/rooms/:roomId/messages` - Get messages

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/ads` - Get all ads
- `PUT /api/admin/ads/:id/status` - Approve/reject ad
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/role` - Update user role
- `GET /api/admin/banners` - Get banners
- `POST /api/admin/banners` - Create banner
- `PUT /api/admin/banners/:id` - Update banner
- `DELETE /api/admin/banners/:id` - Delete banner

## Project Structure

```
sellit/
├── backend/
│   ├── middleware/      # Auth, upload middleware
│   ├── routes/          # API routes
│   ├── socket/          # WebSocket handlers
│   ├── utils/           # Utilities (JWT, OTP)
│   ├── prisma/          # Prisma schema
│   └── server.js        # Express server
│
├── frontend/
│   ├── app/             # Next.js app router pages
│   ├── components/      # React components
│   ├── hooks/           # Custom hooks
│   ├── lib/              # API client, socket
│   └── public/          # Static assets
│
└── README.md
```

## Default Admin User

Create an admin user manually in the database:

```sql
-- After registering a user, update their role:
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

## Production Deployment

1. Set `NODE_ENV=production` in backend `.env`
2. Build frontend: `cd frontend && npm run build`
3. Use PM2 or similar for backend: `pm2 start server.js`
4. Deploy frontend to Vercel/Netlify
5. Configure environment variables in production

## License

MIT

