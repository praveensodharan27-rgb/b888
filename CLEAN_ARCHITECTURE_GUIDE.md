# Clean Architecture Complete Guide

## 📚 What is Clean Architecture?

Clean Architecture is a software design philosophy that separates your code into layers with clear responsibilities. The main goal is to make your codebase:
- **Independent of frameworks** - You can swap out Express, React, Prisma, etc.
- **Testable** - Business logic can be tested without UI or database
- **Independent of UI** - You can change from web to mobile without changing business logic
- **Independent of database** - You can switch from PostgreSQL to MongoDB
- **Independent of external services** - Business logic doesn't depend on third-party APIs

---

## 🏗️ The Layers (From Inner to Outer)

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │  ← Controllers, Routes, UI Components
│  (HTTP, Web, Mobile, CLI)              │
├─────────────────────────────────────────┤
│         Application Layer               │  ← Use Cases, Services, Business Logic
│  (Application-specific business rules) │
├─────────────────────────────────────────┤
│         Domain Layer                    │  ← Entities, Value Objects, Business Rules
│  (Core business logic - most important) │
├─────────────────────────────────────────┤
│         Infrastructure Layer             │  ← Database, APIs, File System, External Services
│  (Technical details, frameworks)        │
└─────────────────────────────────────────┘
```

### Dependency Rule: **Inner layers don't know about outer layers**

- Domain layer doesn't know about Express, React, or Prisma
- Application layer doesn't know about HTTP or UI
- Infrastructure layer implements what Domain/Application needs

---

## 📦 Layer Details

### 1. Domain Layer (Core - Most Important)

**Purpose:** Contains the core business logic and rules. This is the heart of your application.

**Contains:**
- **Entities** - Core business objects (User, Ad, Order)
- **Value Objects** - Immutable objects with no identity (Price, Email, Address)
- **Domain Services** - Business logic that doesn't belong to a single entity
- **Business Rules** - Validation rules, constraints, calculations

**Example:**
```javascript
// backend/src/domain/entities/Ad.js
class Ad {
  constructor(data) {
    this.validate(data);  // Business rule
    this.price = new Price(data.price);  // Value object
  }
  
  validate(data) {
    if (!data.title) throw new Error('Title required');
    if (data.price < 0) throw new Error('Price cannot be negative');
  }
  
  isExpired() {
    return new Date(this.expiresAt) < new Date();
  }
}
```

**Key Points:**
- ✅ No dependencies on frameworks (Express, React, Prisma)
- ✅ Pure business logic
- ✅ Can be tested without database or HTTP
- ✅ Reusable across different applications

---

### 2. Application Layer (Use Cases)

**Purpose:** Orchestrates the flow of data and coordinates domain objects to perform business operations.

**Contains:**
- **Services** - Application-specific business logic
- **Use Cases** - Specific operations (CreateAd, UpdateProfile, ProcessPayment)
- **DTOs** - Data Transfer Objects for moving data between layers

**Example:**
```javascript
// backend/src/application/services/AdService.js
class AdService {
  async createAd(userId, adData) {
    // 1. Check business rules (domain)
    const limitCheck = await this.checkLimit(userId);
    if (!limitCheck.canPost) {
      throw new Error('Free ad limit reached');
    }
    
    // 2. Create domain entity
    const ad = new Ad(adData);
    
    // 3. Save via repository (infrastructure)
    const savedAd = await this.adRepository.create(ad.toJSON());
    
    // 4. Trigger side effects (moderation, indexing)
    await this.moderateAd(savedAd);
    await this.indexAd(savedAd);
    
    return savedAd;
  }
}
```

**Key Points:**
- ✅ Coordinates domain objects
- ✅ Implements use cases
- ✅ Depends on Domain layer
- ✅ Independent of infrastructure details

---

### 3. Infrastructure Layer (Technical Details)

**Purpose:** Handles all technical concerns - database, APIs, file system, external services.

**Contains:**
- **Repositories** - Data access implementations
- **External Services** - Payment gateways, email services, search engines
- **Framework Adapters** - Prisma, Axios, File System

**Example:**
```javascript
// backend/src/infrastructure/database/repositories/AdRepository.js
class AdRepository {
  async findById(id) {
    // Prisma is infrastructure - domain doesn't know about it
    return await prisma.ad.findUnique({ where: { id } });
  }
  
  async create(data) {
    return await prisma.ad.create({ data });
  }
}
```

**Key Points:**
- ✅ Implements interfaces defined by Application/Domain
- ✅ Knows about frameworks (Prisma, Express, etc.)
- ✅ Can be swapped without changing business logic
- ✅ Handles all technical details

---

### 4. Presentation Layer (User Interface)

**Purpose:** Handles user interaction - HTTP requests, UI components, user input/output.

**Contains:**
- **Controllers** - Handle HTTP requests/responses
- **Routes** - Define API endpoints
- **UI Components** - React components, pages
- **Hooks** - React hooks for data fetching

**Example:**
```javascript
// backend/src/presentation/controllers/AdController.js
class AdController {
  async createAd(req, res) {
    try {
      // 1. Extract data from HTTP request
      const adData = req.body;
      
      // 2. Call application service (business logic)
      const ad = await AdService.createAd(req.user.id, adData);
      
      // 3. Format HTTP response
      res.status(201).json({ success: true, ad });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
```

**Frontend Example:**
```typescript
// frontend/src/application/services/AdService.ts
export class AdService {
  async getAds(filters: AdFilters): Promise<Ad[]> {
    return api.get('/ads', { params: filters });
  }
}

// frontend/app/ads/page.tsx (Presentation)
const { data } = useQuery({
  queryKey: ['ads'],
  queryFn: () => adService.getAds(filters)  // Uses service layer
});
```

**Key Points:**
- ✅ Handles HTTP/UI concerns only
- ✅ Delegates business logic to Application layer
- ✅ Formats data for users
- ✅ Validates input format

---

## 🔄 Data Flow Example

Let's trace a "Create Ad" request:

```
1. User clicks "Post Ad" button
   ↓
2. Frontend Component (Presentation)
   - Collects form data
   - Calls AdService.createAd()
   ↓
3. AdService (Application)
   - Validates business rules
   - Creates Ad entity (Domain)
   - Calls AdRepository.create() (Infrastructure)
   ↓
4. AdRepository (Infrastructure)
   - Saves to database using Prisma
   ↓
5. Response flows back up
   Repository → Service → Controller → HTTP Response → Frontend → UI Update
```

---

## ✅ Benefits of Clean Architecture

### 1. **Testability**
```javascript
// Test business logic without database or HTTP
const ad = new Ad({ title: 'Test', price: 100 });
expect(ad.isExpired()).toBe(false);
```

### 2. **Independence**
- Change database? Only update Repository
- Change framework? Only update Presentation layer
- Business logic stays the same

### 3. **Maintainability**
- Clear separation of concerns
- Easy to find where code belongs
- Changes are localized

### 4. **Scalability**
- Add new features following same pattern
- Consistent structure across codebase
- Team members know where to put code

---

## 🎯 Your Codebase Structure

### Backend Structure

```
backend/
  src/
    domain/                          ← Core business logic
      entities/
        Ad.js                        ← Ad business rules
        User.js                       ← User business rules
      valueObjects/
        Price.js                     ← Price calculations
      config/
        AdConfig.js                  ← Business constants
    application/                     ← Use cases
      services/
        AdService.js                 ← Ad operations
        UserService.js               ← User operations
    infrastructure/                  ← Technical details
      database/
        repositories/
          AdRepository.js            ← Database access
          UserRepository.js
    presentation/                    ← HTTP layer
      controllers/
        AdController.js              ← HTTP handling
        UserController.js
      routes/
        adRoutes.js                  ← Route definitions
        userRoutes.js
```

### Frontend Structure

```
frontend/
  src/
    domain/                          ← Business entities
      entities/
        User.ts                      ← User type definitions
        Ad.ts                        ← Ad type definitions
    application/                     ← Business logic
      services/
        AdService.ts                 ← Ad API operations
        UserService.ts               ← User API operations
    infrastructure/                  ← Technical details
      api/
        apiClient.ts                 ← API client setup
    presentation/                    ← UI layer
      components/                    ← React components
      pages/                         ← Next.js pages
      hooks/                         ← React hooks
```

---

## 🔍 Real Examples from Your Code

### Before (Old Way - ❌)

```javascript
// backend/routes/ads.js - Everything mixed together
router.post('/', authenticate, async (req, res) => {
  // Business logic mixed with HTTP
  const FREE_ADS_LIMIT = 2;  // Business rule in route file!
  
  // Direct database access
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  
  // Business logic
  if (user.freeAdsUsed >= FREE_ADS_LIMIT) {
    return res.status(400).json({ error: 'Limit reached' });
  }
  
  // More business logic
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  // Direct database save
  const ad = await prisma.ad.create({ data: { ...req.body, expiresAt } });
  
  res.json({ success: true, ad });
});
```

**Problems:**
- ❌ Business rules in route file
- ❌ Direct Prisma access
- ❌ Hard to test
- ❌ Can't reuse logic

### After (Clean Architecture - ✅)

```javascript
// Domain: backend/src/domain/config/AdConfig.js
class AdConfig {
  static FREE_ADS_LIMIT = 2;
  static calculateExpiryDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }
}

// Domain: backend/src/domain/entities/Ad.js
class Ad {
  validate(data) {
    if (!data.title) throw new Error('Title required');
  }
}

// Infrastructure: backend/src/infrastructure/database/repositories/AdRepository.js
class AdRepository {
  async create(data) {
    return await prisma.ad.create({ data });
  }
}

// Application: backend/src/application/services/AdService.js
class AdService {
  async createAd(userId, adData) {
    const limitCheck = await this.adRepository.checkLimit(userId);
    if (!limitCheck.canPost) {
      throw new Error('Free ad limit reached');
    }
    
    const ad = new Ad({ ...adData, expiresAt: AdConfig.calculateExpiryDate() });
    return await this.adRepository.create(ad.toJSON());
  }
}

// Presentation: backend/src/presentation/controllers/AdController.js
class AdController {
  async createAd(req, res) {
    try {
      const ad = await AdService.createAd(req.user.id, req.body);
      res.status(201).json({ success: true, ad });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

// Presentation: backend/src/presentation/routes/adRoutes.js
router.post('/', authenticate, AdController.createAd.bind(AdController));
```

**Benefits:**
- ✅ Business rules in Domain layer
- ✅ Database access abstracted
- ✅ Easy to test each layer
- ✅ Reusable business logic

---

## 📋 Key Principles

### 1. **Dependency Rule**
```
Inner layers → Outer layers (OK)
Outer layers → Inner layers (OK)
Inner layers → Inner layers (OK)
Outer layers → Outer layers (OK)

BUT: Inner layers should NOT depend on outer layers
```

**Example:**
- ✅ Domain can exist without Infrastructure
- ✅ Application can exist without Presentation
- ❌ Domain should NOT import from Infrastructure
- ❌ Application should NOT import from Presentation

### 2. **Single Responsibility**
Each class/function should have one reason to change:
- **Ad Entity** - Only changes if Ad business rules change
- **AdRepository** - Only changes if database access changes
- **AdService** - Only changes if use case logic changes
- **AdController** - Only changes if HTTP handling changes

### 3. **Open/Closed Principle**
- Open for extension (add new features)
- Closed for modification (don't change existing code)

**Example:**
```javascript
// Easy to add new ad types without changing existing code
class PremiumAd extends Ad {
  // New features
}
```

### 4. **Dependency Inversion**
Depend on abstractions, not concretions:

```javascript
// ❌ Bad: Depends on concrete Prisma
class AdService {
  constructor() {
    this.prisma = new PrismaClient();  // Concrete dependency
  }
}

// ✅ Good: Depends on abstraction
class AdService {
  constructor(adRepository) {
    this.adRepository = adRepository;  // Abstract interface
  }
}
```

---

## 🚀 How to Use Clean Architecture

### When Adding a New Feature

1. **Start with Domain** - Define entities and business rules
2. **Create Repository** - Define data access interface
3. **Implement Service** - Add business logic
4. **Create Controller** - Handle HTTP requests
5. **Add Routes** - Define endpoints

### Example: Adding "Comments" Feature

```javascript
// 1. Domain Entity
// src/domain/entities/Comment.js
class Comment {
  validate(data) {
    if (!data.text) throw new Error('Comment text required');
    if (data.text.length > 1000) throw new Error('Comment too long');
  }
}

// 2. Repository
// src/infrastructure/database/repositories/CommentRepository.js
class CommentRepository {
  async create(data) { /* ... */ }
  async findByAdId(adId) { /* ... */ }
}

// 3. Service
// src/application/services/CommentService.js
class CommentService {
  async createComment(userId, adId, text) {
    const comment = new Comment({ userId, adId, text });
    return await this.commentRepository.create(comment.toJSON());
  }
}

// 4. Controller
// src/presentation/controllers/CommentController.js
class CommentController {
  async createComment(req, res) {
    const comment = await CommentService.createComment(
      req.user.id,
      req.params.adId,
      req.body.text
    );
    res.json({ success: true, comment });
  }
}

// 5. Routes
// src/presentation/routes/commentRoutes.js
router.post('/ads/:adId/comments', authenticate, CommentController.createComment);
```

---

## 🎓 Learning Resources

1. **Original Article:** "Clean Architecture" by Robert C. Martin (Uncle Bob)
2. **Book:** "Clean Architecture" by Robert C. Martin
3. **Video:** Search "Clean Architecture" on YouTube
4. **Your Codebase:** Check `backend/src/` for examples

---

## ✅ Checklist: Is My Code Clean?

- [ ] Business logic separated from HTTP/UI?
- [ ] Database access abstracted in repositories?
- [ ] Business rules in domain entities?
- [ ] Services coordinate domain objects?
- [ ] Controllers only handle HTTP?
- [ ] Can test business logic without database?
- [ ] Can swap database without changing business logic?
- [ ] Clear separation between layers?

---

## 🎯 Summary

**Clean Architecture = Organized Code**

- **Domain** = What your business does (core)
- **Application** = How to do it (use cases)
- **Infrastructure** = Technical details (database, APIs)
- **Presentation** = User interface (HTTP, UI)

**Remember:** Inner layers don't know about outer layers. Business logic is independent of frameworks and databases.

---

**Your Implementation Status:**
- ✅ Ads module - Clean Architecture
- ✅ User module - Clean Architecture
- ⏳ Other modules - Can be refactored using same pattern

**Next Steps:**
1. Understand the layers
2. Follow the pattern for new features
3. Gradually refactor existing code
4. Test each layer independently

---

**Questions?** Check the code in `backend/src/` for real examples!
