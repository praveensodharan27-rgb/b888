# Enterprise-Ready API Endpoints

This document describes the newly added enterprise-ready endpoints for session management, ad drafts/renewal, chat read receipts, wallet statements, admin feature flags, and system versioning.

**Base URL:** `http://localhost:5000/api`

---

## 🔐 Session Management (`/api/session`)

Manage user sessions across multiple devices.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/session` | Yes | Get all active sessions for current user |
| GET | `/api/session/current` | Yes | Get current session details |
| DELETE | `/api/session/:sessionId` | Yes | Revoke a specific session |
| DELETE | `/api/session/others` | Yes | Revoke all other sessions (keep current) |
| DELETE | `/api/session/all` | Yes | Revoke all sessions (including current) |
| PATCH | `/api/session/:sessionId/activity` | Yes | Update session activity |
| GET | `/api/session/stats` | Yes | Get session statistics |
| GET | `/api/session/admin/user/:userId` | Admin | Get all sessions for a user (admin) |

### Examples

**Get all sessions:**
```bash
GET /api/session
Authorization: Bearer {token}
```

**Revoke a specific session:**
```bash
DELETE /api/session/{sessionId}
Authorization: Bearer {token}
```

**Revoke all other sessions:**
```bash
DELETE /api/session/others
Authorization: Bearer {token}
```

---

## 📝 Ad Drafts (`/api/ads/draft*`)

Save, manage, and publish ad drafts before going live.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ads/draft` | Yes | Save ad as draft |
| GET | `/api/ads/drafts` | Yes | Get all drafts for current user |
| GET | `/api/ads/draft/:id` | Yes | Get a specific draft |
| PUT | `/api/ads/draft/:id` | Yes | Update a draft |
| POST | `/api/ads/draft/:id/publish` | Yes | Publish a draft (change to pending) |
| DELETE | `/api/ads/draft/:id` | Yes | Delete a draft |

### Examples

**Save a draft:**
```bash
POST /api/ads/draft
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "iPhone 13 Pro",
  "description": "Excellent condition",
  "price": 50000,
  "categoryId": "...",
  "images": ["url1", "url2"]
}
```

**Publish a draft:**
```bash
POST /api/ads/draft/{id}/publish
Authorization: Bearer {token}
```

---

## 🔄 Ad Renewal (`/api/ads/:id/renew*`)

Renew expired or sold ads to bring them back to active status.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ads/:id/renew` | Yes | Renew an expired ad |
| GET | `/api/ads/:id/renewal-history` | Yes | Get renewal history for an ad |
| GET | `/api/ads/:id/renewal-status` | Yes | Check if ad can be renewed |

### Examples

**Renew an ad:**
```bash
POST /api/ads/{id}/renew
Authorization: Bearer {token}
Content-Type: application/json

{
  "days": 30  // Optional, defaults to 30
}
```

**Check renewal status:**
```bash
GET /api/ads/{id}/renewal-status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "canRenew": true,
  "isExpired": true,
  "status": "EXPIRED",
  "expiresAt": "2024-01-01T00:00:00.000Z",
  "daysUntilExpiry": -5
}
```

---

## ✅ Chat Read Receipts (`/api/chat/messages/*`)

Track message read status and manage read receipts.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chat/messages/:messageId/read` | Yes | Mark a message as read |
| POST | `/api/chat/rooms/:roomId/read-all` | Yes | Mark all messages in a room as read |
| GET | `/api/chat/messages/:messageId/read-receipts` | Yes | Get read receipts for a message |
| POST | `/api/chat/messages/read-status` | Yes | Get read status for multiple messages |
| GET | `/api/chat/rooms/unread-counts` | Yes | Get unread message count per room |

### Examples

**Mark message as read:**
```bash
POST /api/chat/messages/{messageId}/read
Authorization: Bearer {token}
```

**Mark all messages in room as read:**
```bash
POST /api/chat/rooms/{roomId}/read-all
Authorization: Bearer {token}
```

**Get read status for multiple messages:**
```bash
POST /api/chat/messages/read-status
Authorization: Bearer {token}
Content-Type: application/json

{
  "messageIds": ["id1", "id2", "id3"]
}
```

---

## 💰 Wallet Statements (`/api/wallet/statement*`)

Generate detailed financial statements for wallet transactions.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/wallet/statement` | Yes | Get wallet statement (with filters) |
| GET | `/api/wallet/statement/download` | Yes | Download wallet statement as PDF (placeholder) |

### Query Parameters

- `startDate` - Start date (ISO format)
- `endDate` - End date (ISO format)
- `type` - Transaction type (`CREDIT` or `DEBIT`)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

### Examples

**Get statement for date range:**
```bash
GET /api/wallet/statement?startDate=2024-01-01&endDate=2024-01-31&type=CREDIT
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "statement": {
    "walletId": "...",
    "openingBalance": 1000.00,
    "closingBalance": 1500.00,
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "summary": {
      "totalCredits": 1000.00,
      "totalDebits": 500.00,
      "netAmount": 500.00
    },
    "transactions": [...],
    "pagination": {...}
  }
}
```

---

## 🚩 Admin Feature Flags (`/api/admin/feature-flags*`)

Manage feature flags for enabling/disabling features dynamically.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/feature-flags` | Admin | Get all feature flags |
| GET | `/api/admin/feature-flags/:flagName` | Admin | Get a specific feature flag |
| POST | `/api/admin/feature-flags/:flagName` | Admin | Create or update a feature flag |
| PATCH | `/api/admin/feature-flags/:flagName/toggle` | Admin | Toggle a feature flag |
| DELETE | `/api/admin/feature-flags/:flagName` | Admin | Delete a feature flag |
| POST | `/api/admin/feature-flags/bulk` | Admin | Bulk update feature flags |
| GET | `/api/admin/feature-flags/:flagName/stats` | Admin | Get feature flag usage statistics |

### Examples

**Get all feature flags:**
```bash
GET /api/admin/feature-flags
Authorization: Bearer {admin_token}
```

**Create/update a feature flag:**
```bash
POST /api/admin/feature-flags/new_chat_feature
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "enabled": true,
  "description": "Enable new chat UI"
}
```

**Toggle a feature flag:**
```bash
PATCH /api/admin/feature-flags/new_chat_feature/toggle
Authorization: Bearer {admin_token}
```

**Bulk update:**
```bash
POST /api/admin/feature-flags/bulk
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "flags": {
    "feature1": { "enabled": true },
    "feature2": { "enabled": false },
    "feature3": { "value": "custom_value" }
  }
}
```

---

## ⚙️ System Version & Info (`/api/system/*`)

Get system version, health, and metrics information.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/system/version` | No | Get system version information |
| GET | `/api/system/info` | Admin | Get detailed system information |
| GET | `/api/system/health` | No | Get system health check |
| GET | `/api/system/status` | No | Get API status |
| GET | `/api/system/metrics` | Admin | Get system metrics |

### Examples

**Get version:**
```bash
GET /api/system/version
```

**Response:**
```json
{
  "success": true,
  "version": {
    "api": {
      "version": "1.0.0",
      "name": "sellit-backend",
      "description": "OLX-like classifieds backend API",
      "nodeVersion": "v18.0.0",
      "environment": "development"
    },
    "database": {
      "provider": "mongodb",
      "connected": true
    },
    "server": {
      "uptime": 3600,
      "timestamp": "2024-01-15T10:00:00.000Z",
      "timezone": "Asia/Kolkata"
    }
  }
}
```

**Get system info (admin):**
```bash
GET /api/system/info
Authorization: Bearer {admin_token}
```

**Get health check:**
```bash
GET /api/system/health
```

**Get metrics (admin):**
```bash
GET /api/system/metrics
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "metrics": {
    "users": {
      "total": 1000,
      "last24Hours": 50,
      "last7Days": 300,
      "last30Days": 800,
      "active24Hours": 200
    },
    "ads": {
      "total": 5000,
      "active": 3000,
      "last24Hours": 100,
      "last7Days": 500,
      "last30Days": 2000
    },
    "revenue": {
      "last24Hours": 5000.00,
      "last7Days": 35000.00,
      "last30Days": 150000.00,
      "currency": "INR"
    },
    "system": {
      "uptime": 86400,
      "uptimeFormatted": "1d",
      "memoryUsage": {
        "used": 256,
        "total": 512
      },
      "timestamp": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

---

## 📊 Summary

### New Endpoints Added

- **Session Management:** 8 endpoints
- **Ad Drafts:** 6 endpoints
- **Ad Renewal:** 3 endpoints
- **Chat Read Receipts:** 5 endpoints
- **Wallet Statements:** 2 endpoints
- **Admin Feature Flags:** 7 endpoints
- **System Version/Info:** 5 endpoints

**Total:** 36 new enterprise-ready endpoints

### Features Enabled

✅ Multi-device session management  
✅ Ad draft saving and publishing  
✅ Ad renewal for expired/sold ads  
✅ Chat read receipts and status tracking  
✅ Detailed wallet financial statements  
✅ Dynamic feature flag management  
✅ System versioning and health monitoring  

---

## 🔒 Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer {your_jwt_token}
```

Admin endpoints require both authentication and admin role.

---

## 📝 Notes

1. **Ad Drafts:** Drafts are stored with `moderationStatus: 'draft'`. When published, they change to `moderationStatus: 'pending'` and `status: 'PENDING'`.

2. **Session Management:** Sessions are tracked via `RefreshToken` model. Revoking a session sets `revoked: true` instead of deleting the record.

3. **Feature Flags:** Feature flags are stored in the `PremiumSettings` model with keys prefixed with `feature_`.

4. **Wallet Statements:** Statements include opening balance, closing balance, and transaction summaries. PDF download is a placeholder for future implementation.

5. **System Metrics:** Metrics include user growth, ad statistics, revenue, and server performance data.

---

**Last Updated:** 2024-01-15  
**API Version:** 1.0.0

