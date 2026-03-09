# Sponsored Ads System - Setup Guide

## Overview

Sponsored ads are location-targeted ads shown on the ad detail page (below Seller Information). Admins manage them from the admin panel.

## Database Setup

### Option 1: Prisma (if schema is valid)

```bash
cd backend
npx prisma generate --schema=prisma/schema.mongodb.prisma
npx prisma db push --schema=prisma/schema.mongodb.prisma
```

### Option 2: Manual MongoDB (if Prisma fails)

```bash
cd backend
node scripts/create-sponsored-ads-collection.js
```

## Admin Panel

1. Go to **Admin** → **Sponsored Ads**
2. Create ads with:
   - **Ad Title** (required)
   - **Banner Image** (optional)
   - **Description**, **CTA Type** (website/call/whatsapp), **Redirect URL**
   - **Target Locations** (comma-separated slugs, e.g. `kottayam, pala, changanassery` – leave empty for all)
   - **Category Slug** (optional: cars, jobs, property)
   - **Ad Size** (small/medium/large)
   - **Start/End Date**, **Budget**, **Priority**
   - **Status** (active/paused/expired)

## Location Targeting

- **User location** (Filter > Profile > GPS) is sent to the API
- Ads with matching `targetLocations` or empty array (platform default) are shown
- Fallback: platform default ads (empty targetLocations)

## Space Detection

- `freeSpace < 80px` → No ad
- `80–180px` → Small Ad
- `180–300px` → Medium Ad
- `> 300px` → Large Ad

## Analytics

- **Impressions** and **Clicks** are tracked
- **CTR** is computed in the admin analytics dashboard

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sponsored-ads?location=&category=&size=` | Fetch matching ad (public) |
| POST | `/api/sponsored-ads/:id/impression` | Track impression |
| POST | `/api/sponsored-ads/:id/click` | Track click |
| GET | `/api/admin/sponsored-ads` | List all (admin) |
| POST | `/api/admin/sponsored-ads` | Create (admin) |
| PUT | `/api/admin/sponsored-ads/:id` | Update (admin) |
| DELETE | `/api/admin/sponsored-ads/:id` | Delete (admin) |
| GET | `/api/admin/sponsored-ads/analytics` | Analytics (admin) |
