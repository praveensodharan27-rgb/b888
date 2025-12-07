# Clean Architecture + MVC Implementation

## 📁 Folder Structure

```
backend/
  src/
    config/
      env.js                    # Environment configuration
    infrastructure/
      db/
        prismaClient.js         # Prisma client singleton
      email/
        emailService.js         # Email service (Nodemailer)
      sms/
        smsService.js           # SMS service (Twilio)
    shared/
      utils/
        otpGenerator.js         # OTP generation utility
    modules/
      auth/
        controllers/
          authController.js     # HTTP request/response handling
        services/
          authService.js        # Business logic
        repositories/
          userRepository.js     # User data access
          otpRepository.js      # OTP data access
        routes/
          authRoutes.js         # Route definitions
    server.js                   # Express app entry point
```

## 🏗️ Architecture Layers

### 1. **Infrastructure Layer** (`infrastructure/`)
- **Purpose**: External services and infrastructure concerns
- **Components**:
  - Database (Prisma client)
  - Email service (Nodemailer)
  - SMS service (Twilio)

### 2. **Shared Layer** (`shared/`)
- **Purpose**: Shared utilities and helpers
- **Components**:
  - OTP generator
  - Common utilities

### 3. **Domain/Module Layer** (`modules/`)
- **Purpose**: Business domain logic organized by feature
- **Structure**:
  - **Controllers**: Handle HTTP requests/responses (MVC)
  - **Services**: Business logic
  - **Repositories**: Data access layer
  - **Routes**: Route definitions

## 🔄 Data Flow

```
HTTP Request
    ↓
Routes (authRoutes.js)
    ↓
Controller (authController.js) - Validates input, returns JSON
    ↓
Service (authService.js) - Business logic
    ↓
Repository (userRepository.js / otpRepository.js) - Data access
    ↓
Infrastructure (prismaClient.js) - Database
```

## 📋 API Endpoints

### POST `/api/auth/send-otp`
Send OTP to user's email or phone.

**Request Body:**
```json
{
  "email": "user@example.com"  // OR
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent to user@example.com"
}
```

### POST `/api/auth/verify-otp`
Verify OTP code.

**Request Body:**
```json
{
  "email": "user@example.com",  // OR
  "phone": "+1234567890",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "User Name",
    "isVerified": true
  }
}
```

## 🔧 Key Features

### 1. **Dependency Injection**
- Services and repositories are exported as singleton instances
- Easy to mock for testing
- Loose coupling between layers

### 2. **Separation of Concerns**
- **Controllers**: Only handle HTTP (request/response)
- **Services**: Business logic only
- **Repositories**: Data access only
- **Infrastructure**: External services only

### 3. **Error Handling**
- Centralized error handling in server.js
- Try-catch blocks in all layers
- Meaningful error messages

### 4. **Validation**
- Input validation using express-validator
- Validation middleware in routes

### 5. **Environment Configuration**
- Centralized env.js
- Type-safe environment variables
- Validation on startup

## 🚀 Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Old Server (if needed)
```bash
npm run dev:old  # Uses old server.js
npm run start:old
```

## 📝 Environment Variables

Required in `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key
NODE_ENV=development

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# OTP
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
```

## 🧪 Testing the API

### Send OTP
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Verify OTP
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "code": "123456"}'
```

## 🔐 Security Features

1. **OTP Expiry**: OTPs expire after configured minutes
2. **One-time Use**: OTPs are marked as used after verification
3. **Input Validation**: All inputs are validated
4. **Error Messages**: Generic error messages in production
5. **CORS**: Configured for frontend origin only

## 📚 Next Steps

To add more modules (e.g., ads, users):

1. Create module folder: `src/modules/ads/`
2. Create structure:
   - `controllers/adsController.js`
   - `services/adsService.js`
   - `repositories/adsRepository.js`
   - `routes/adsRoutes.js`
3. Mount routes in `server.js`

## 🎯 Benefits of This Architecture

1. **Maintainability**: Clear separation of concerns
2. **Testability**: Easy to mock dependencies
3. **Scalability**: Easy to add new modules
4. **Reusability**: Services and repositories can be reused
5. **Type Safety**: Clear interfaces between layers

