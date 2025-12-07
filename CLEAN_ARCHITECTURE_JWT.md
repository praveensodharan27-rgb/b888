# JWT Implementation in Clean Architecture

## 📁 File Locations

### Current (Old) Location
```
backend/utils/jwt.js  ← Old location
```

### New Clean Architecture Location
```
backend/src/infrastructure/auth/JwtService.js  ← Infrastructure layer
backend/src/domain/services/AuthDomainService.js  ← Domain layer
```

---

## 🏗️ Why Two Files?

### 1. JwtService (Infrastructure Layer)
**Location:** `backend/src/infrastructure/auth/JwtService.js`

**Purpose:** Technical implementation of JWT operations
- Token generation (using jsonwebtoken library)
- Token verification (using jsonwebtoken library)
- Token decoding
- Expiration checking

**Why Infrastructure?**
- Uses external library (jsonwebtoken)
- Handles technical details (signing, verification)
- Can be swapped with different JWT implementation

**Example:**
```javascript
const JwtService = require('../../infrastructure/auth/JwtService');

// Generate token
const token = JwtService.generateToken(userId);

// Verify token
const decoded = JwtService.verifyToken(token);
```

---

### 2. AuthDomainService (Domain Layer)
**Location:** `backend/src/domain/services/AuthDomainService.js`

**Purpose:** Business rules for authentication
- User ID validation rules
- Authentication eligibility rules
- Token expiration rules based on user role
- Email/phone validation rules

**Why Domain?**
- Contains business logic
- No dependencies on external libraries
- Pure business rules

**Example:**
```javascript
const AuthDomainService = require('../../domain/services/AuthDomainService');

// Check business rules
if (!AuthDomainService.canAuthenticate(user)) {
  throw new Error('User cannot authenticate');
}

// Get expiration based on role (business rule)
const expiration = AuthDomainService.getTokenExpirationForRole(user.role);
```

---

## 🔄 How They Work Together

```javascript
// Application Service (combines both)
const JwtService = require('../../infrastructure/auth/JwtService');
const AuthDomainService = require('../../domain/services/AuthDomainService');

class AuthService {
  async login(user, password) {
    // 1. Business rule validation (Domain)
    if (!AuthDomainService.canAuthenticate(user)) {
      throw new Error('User cannot authenticate');
    }
    
    // 2. Verify password (business logic)
    // ... password verification ...
    
    // 3. Generate token (Infrastructure)
    const token = JwtService.generateToken(user.id);
    
    return { user, token };
  }
}
```

---

## 📋 Migration Guide

### Step 1: Update Imports

**Old way:**
```javascript
const { generateToken, verifyToken } = require('../utils/jwt');
```

**New way:**
```javascript
const JwtService = require('../../infrastructure/auth/JwtService');
const AuthDomainService = require('../../domain/services/AuthDomainService');
```

### Step 2: Update Function Calls

**Old way:**
```javascript
const token = generateToken(userId);
const decoded = verifyToken(token);
```

**New way:**
```javascript
const token = JwtService.generateToken(userId);
const decoded = JwtService.verifyToken(token);
```

### Step 3: Add Business Rules

**New (with business rules):**
```javascript
// Check business rules first
if (!AuthDomainService.isValidUserId(userId)) {
  throw new Error('Invalid user ID');
}

if (!AuthDomainService.canAuthenticate(user)) {
  throw new Error('User cannot authenticate');
}

// Then generate token
const token = JwtService.generateToken(userId);
```

---

## ✅ Benefits

1. **Separation of Concerns**
   - Technical JWT operations (Infrastructure)
   - Business rules (Domain)

2. **Testability**
   - Test business rules without JWT library
   - Test JWT operations independently

3. **Flexibility**
   - Can swap JWT library without changing business rules
   - Can change business rules without changing JWT implementation

4. **Maintainability**
   - Clear where each piece of logic belongs
   - Easy to find and update

---

## 🔍 Usage Examples

### In Auth Service
```javascript
// backend/src/application/services/AuthService.js
const JwtService = require('../../infrastructure/auth/JwtService');
const AuthDomainService = require('../../domain/services/AuthDomainService');

class AuthService {
  async login(email, password) {
    // Business rule: Validate input
    const validation = AuthDomainService.validateAuthAttempt({ email, password });
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }
    
    // Find user (repository)
    const user = await this.userRepository.findByEmail(email);
    
    // Business rule: Check if can authenticate
    if (!AuthDomainService.canAuthenticate(user)) {
      throw new Error('Account is deactivated');
    }
    
    // Verify password (business logic)
    // ... password verification ...
    
    // Generate token (infrastructure)
    const token = JwtService.generateToken(user.id);
    
    return { user, token };
  }
}
```

### In Middleware
```javascript
// backend/middleware/auth.js
const JwtService = require('../src/infrastructure/auth/JwtService');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    // Verify token (infrastructure)
    const decoded = JwtService.verifyToken(token);
    
    // Get user (repository)
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message });
  }
};
```

---

## 📊 Comparison

| Aspect | Old (utils/jwt.js) | New (Clean Architecture) |
|--------|-------------------|------------------------|
| **Location** | `backend/utils/` | `backend/src/infrastructure/auth/` |
| **Business Rules** | Mixed with technical code | Separated in Domain layer |
| **Testability** | Hard to test business rules | Easy to test separately |
| **Dependencies** | Direct jsonwebtoken usage | Abstracted in Infrastructure |
| **Flexibility** | Tightly coupled | Can swap implementations |

---

## 🚀 Next Steps

1. **Update existing code** to use new JwtService
2. **Add business rules** using AuthDomainService
3. **Update middleware** to use new service
4. **Test thoroughly** to ensure no breaking changes

---

## 📝 Summary

- **JwtService** = Technical JWT operations (Infrastructure)
- **AuthDomainService** = Business rules for auth (Domain)
- **Together** = Complete authentication with clean separation

**Key Principle:** Technical details (JWT) in Infrastructure, Business rules in Domain!
