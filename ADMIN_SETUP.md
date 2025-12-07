# Admin Setup Guide

## ✅ Admin User Created

**Default Admin Credentials:**
- **Email:** `admin@sellit.com`
- **Password:** `admin123`
- **Role:** ADMIN
- **Status:** Verified

## 🔐 Login as Admin

1. Go to: http://localhost:3000/login
2. Enter email: `admin@sellit.com`
3. Enter password: `admin123`
4. Click "Login"
5. You'll be automatically redirected to the Admin Panel

## 📋 Admin Features

### Category Management
- ✅ Create Categories
- ✅ Edit Categories
- ✅ Delete Categories (if no ads)
- ✅ Auto-generate slugs
- ✅ Set category order
- ✅ Activate/Deactivate categories

### Subcategory Management
- ✅ Create Subcategories
- ✅ Edit Subcategories
- ✅ Delete Subcategories (if no ads)
- ✅ Auto-generate slugs
- ✅ Activate/Deactivate subcategories

### Other Admin Features
- ✅ Dashboard with stats
- ✅ Approve/Reject Ads
- ✅ Manage Users
- ✅ Manage Banners

## 🛠️ Create New Admin User

To create a new admin user, run:

```bash
cd backend
npm run create-admin
```

Or set environment variables in `backend/.env`:
```env
ADMIN_EMAIL=your-admin@email.com
ADMIN_PASSWORD=your-secure-password
ADMIN_NAME=Admin Name
ADMIN_PHONE=+1234567890
```

Then run:
```bash
npm run create-admin
```

## 📍 Admin Panel Access

- **URL:** http://localhost:3000/admin
- **Access:** Only users with `ADMIN` role
- **Auto-redirect:** Admins are redirected to `/admin` after login

## 🎯 Category Management UI

1. Login as admin
2. Go to Admin Panel: http://localhost:3000/admin
3. Click "Categories" tab
4. Use "Add Category" button to create categories
5. Click on category to expand and manage subcategories
6. Use "Add Subcategory" button to create subcategories

## 🔧 API Endpoints

### Categories
- `GET /api/admin/categories` - Get all categories
- `POST /api/admin/categories` - Create category
- `PUT /api/admin/categories/:id` - Update category
- `DELETE /api/admin/categories/:id` - Delete category

### Subcategories
- `GET /api/admin/subcategories` - Get all subcategories
- `POST /api/admin/subcategories` - Create subcategory
- `PUT /api/admin/subcategories/:id` - Update subcategory
- `DELETE /api/admin/subcategories/:id` - Delete subcategory

## 📝 Notes

- Slugs are auto-generated from names if not provided
- Categories/Subcategories with ads cannot be deleted
- All admin routes require authentication and ADMIN role
- Admin user is auto-verified (no OTP needed)

