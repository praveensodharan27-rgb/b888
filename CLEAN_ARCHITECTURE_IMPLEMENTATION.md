# Clean Architecture Implementation Guide

## ✅ Implementation Status

### Backend - Completed Modules

#### 1. Ads Module ✅
- **Domain Layer:**
  - `src/domain/entities/Ad.js` - Ad entity with business rules
  - `src/domain/valueObjects/Price.js` - Price value object
  - `src/domain/config/AdConfig.js` - Business constants

- **Infrastructure Layer:**
  - `src/infrastructure/database/repositories/AdRepository.js` - Data access

- **Application Layer:**
  - `src/application/services/AdService.js` - Business logic

- **Presentation Layer:**
  - `src/presentation/controllers/AdController.js` - HTTP handling
  - `src/presentation/routes/adRoutes.js` - Route definitions

#### 2. User Module ✅
- **Domain Layer:**
  - `src/domain/entities/User.js` - User entity with business rules

- **Infrastructure Layer:**
  - `src/infrastructure/database/repositories/UserRepository.js` - Data access

- **Application Layer:**
  - `src/application/services/UserService.js` - Business logic

- **Presentation Layer:**
  - `src/presentation/controllers/UserController.js` - HTTP handling
  - `src/presentation/routes/userRoutes.js` - Route definitions

### Frontend - Completed Structure

#### 1. Domain Layer ✅
- `src/domain/entities/User.ts` - User entity types
- `src/domain/entities/Ad.ts` - Ad entity types

#### 2. Application Layer ✅
- `src/application/services/AdService.ts` - Ad business logic
- `src/application/services/UserService.ts` - User business logic

#### 3. Infrastructure Layer ✅
- `src/infrastructure/api/apiClient.ts` - API client abstraction

#### 4. Presentation Layer ✅
- Updated `app/profile/page.tsx` to use services

---

## 🔄 Migration Steps

### Step 1: Update Backend Server

Update `backend/server.js` to use new routes:

```javascript
// Replace old routes
// const adRoutes = require('./routes/ads');
// const userRoutes = require('./routes/user');

// With new clean architecture routes
const adRoutes = require('./src/presentation/routes/adRoutes');
const userRoutes = require('./src/presentation/routes/userRoutes');

app.use('/api/ads', adRoutes);
app.use('/api/user', userRoutes);
```

### Step 2: Test Backend

1. Start backend server
2. Test endpoints:
   - `GET /api/ads` - Should work with new controller
   - `GET /api/ads/:id` - Should work with new controller
   - `POST /api/ads` - Should work with new service
   - `GET /api/user/profile` - Should work with new controller
   - `PUT /api/user/profile` - Should work with new service

### Step 3: Update Frontend Components

Continue refactoring components to use services:

1. **Ads Pages:**
   - `app/ads/page.tsx` - Use `adService.getAds()`
   - `app/ads/[id]/page.tsx` - Use `adService.getAdById()`
   - `app/post-ad/page.tsx` - Use `adService.createAd()`

2. **User Pages:**
   - `app/user/[userId]/page.tsx` - Use `userService.getPublicProfile()`
   - `app/settings/page.tsx` - Use `userService.updateProfile()`

### Step 4: Refactor Remaining Modules

Apply same pattern to:
- Categories
- Locations
- Chat
- Premium
- Admin

---

## 📁 Directory Structure

### Backend
```
backend/
  src/
    domain/
      entities/
        Ad.js
        User.js
      valueObjects/
        Price.js
      config/
        AdConfig.js
    application/
      services/
        AdService.js
        UserService.js
    infrastructure/
      database/
        repositories/
          AdRepository.js
          UserRepository.js
    presentation/
      controllers/
        AdController.js
        UserController.js
      routes/
        adRoutes.js
        userRoutes.js
```

### Frontend
```
frontend/
  src/
    domain/
      entities/
        User.ts
        Ad.ts
    application/
      services/
        AdService.ts
        UserService.ts
    infrastructure/
      api/
        apiClient.ts
    presentation/
      components/
      pages/
      hooks/
```

---

## 🎯 Benefits Achieved

1. **Separation of Concerns** ✅
   - Business logic separated from HTTP handling
   - Data access abstracted in repositories

2. **Testability** ✅
   - Services can be tested independently
   - Repositories can be mocked

3. **Maintainability** ✅
   - Clear structure and responsibilities
   - Easy to locate and modify code

4. **Scalability** ✅
   - Easy to add new features
   - Consistent patterns across modules

---

## 🚀 Next Steps

1. **Update server.js** to use new routes
2. **Test thoroughly** to ensure no breaking changes
3. **Refactor remaining modules** (Categories, Locations, etc.)
4. **Update frontend components** to use services consistently
5. **Add unit tests** for services and repositories

---

## ⚠️ Important Notes

- **Old routes still exist** in `backend/routes/` - keep for reference during migration
- **Gradual migration** - can run old and new code in parallel
- **Test each module** before moving to next
- **Update frontend incrementally** - don't break existing functionality

---

**Status:** Phase 1 Complete (Ads & User modules)
**Next:** Update server.js and test, then continue with other modules
