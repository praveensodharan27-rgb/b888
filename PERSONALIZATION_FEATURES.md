# Personalization Features Implementation

## Overview

This document describes the complete implementation of user activity tracking, interest analysis, personalized offers, and location + time-based notifications.

## Features Implemented

### 1. User Activity Tracking ✅
- Tracks all user actions (views, searches, favorites, contacts, etc.)
- Stores activity metadata, location, and timestamps
- Automatically updates user interests based on activities

**API Endpoints:**
- `POST /api/personalization/track` - Track user activity
- `GET /api/personalization/activity/stats` - Get activity statistics

### 2. User Interest Analysis ✅
- Analyzes user behavior to understand preferences
- Calculates interest scores (0-100) based on activities
- Tracks keywords, price ranges, categories, and locations
- Updates interests automatically when activities are tracked

**API Endpoints:**
- `GET /api/personalization/interests` - Get user top interests
- `POST /api/personalization/interests/analyze` - Analyze user interests

### 3. Personalized Offers ✅
- Generates personalized offers based on user interests
- Matches offers to user's preferred categories and locations
- Links relevant ads to offers
- Supports claiming offers

**API Endpoints:**
- `GET /api/personalization/offers` - Get personalized offers
- `POST /api/personalization/offers/generate` - Generate new offers
- `POST /api/personalization/offers/:id/claim` - Claim an offer

### 4. Location + Time Based Notifications ✅
- Schedule notifications for specific times
- Send to specific users, locations, or broadcast to all
- Supports Socket.io and SMS delivery
- Automatic processing via cron job (every minute)

**API Endpoints:**
- `GET /api/personalization/notifications/schedules` - Get notification schedules (Admin)
- `POST /api/personalization/notifications/schedule` - Schedule notification (Admin)
- `POST /api/personalization/notifications/:id/send` - Send notification immediately (Admin)

## Database Models

### UserActivity
- Tracks all user activities with metadata
- Links to user and location
- Indexed for fast queries

### UserInterest
- Stores user interests with scores
- Links to categories, subcategories, and locations
- Tracks keywords and price ranges

### PersonalizedOffer
- Generated offers for specific users
- Links to global offers, categories, and locations
- Tracks claim status and expiration

### NotificationSchedule
- Scheduled notifications with time and location
- Supports Socket.io, SMS, or both
- Tracks sent status

## Admin Panel

Access the personalization management panel at:
- URL: `/admin?tab=personalization`
- Features:
  - View activity statistics
  - View top user interests
  - View personalized offers
  - Schedule and manage notifications

## Integration

### Socket.io
- Real-time notifications sent via Socket.io
- Users receive notifications in their personal room: `user:{userId}`
- Event name: `notification`

### SMS
- Notifications sent via Twilio SMS service
- Uses `sendMessage()` method for general notifications
- Configured via environment variables:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_PHONE_NUMBER`

## Setup Instructions

1. **Update Database Schema:**
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   ```

2. **Install Dependencies (if needed):**
   ```bash
   npm install node-cron
   ```

3. **Environment Variables:**
   Ensure these are set in `.env`:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=your_phone_number
   ```

4. **Start Server:**
   ```bash
   npm run dev
   ```

## Usage Examples

### Track User Activity
```javascript
POST /api/personalization/track
{
  "activityType": "view_ad",
  "entityType": "ad",
  "entityId": "ad123",
  "metadata": {
    "categoryId": "cat123",
    "priceRange": { "min": 1000, "max": 5000 }
  }
}
```

### Schedule Notification
```javascript
POST /api/personalization/notifications/schedule
{
  "title": "Special Offer!",
  "message": "Get 20% off on all electronics",
  "type": "offer",
  "notificationType": "both",
  "scheduledAt": "2024-01-15T10:00:00Z",
  "locationId": "loc123",
  "radius": 10
}
```

## Notes

- All features use Socket.io and SMS only (no Firebase)
- Notifications are processed automatically every minute via cron
- User interests are updated automatically when activities are tracked
- Personalized offers are generated based on user interests and available global offers
