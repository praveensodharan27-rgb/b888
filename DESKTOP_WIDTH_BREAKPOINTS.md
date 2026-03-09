# 📐 Desktop Width & Responsive Breakpoints

## Tailwind CSS Breakpoints (Default)

Your project uses **Tailwind's default breakpoints**:

| Breakpoint | Min Width | Device | Usage |
|------------|-----------|--------|-------|
| `sm:` | 640px | Small tablets | `sm:grid-cols-2` |
| `md:` | 768px | Tablets | `md:grid-cols-3` |
| `lg:` | 1024px | **Desktop** | `lg:grid-cols-4` |
| `xl:` | 1280px | Large desktop | `xl:grid-cols-5` |
| `2xl:` | 1536px | Extra large | `2xl:max-w-7xl` |

---

## 🖥️ Desktop Width = 1024px+

**Desktop starts at**: `lg:` breakpoint = **1024px**

### Common Desktop Patterns in Your Code

```tsx
// Desktop-specific layouts
className="lg:flex-row"           // Row layout on desktop
className="lg:grid-cols-4"        // 4 columns on desktop
className="lg:w-[280px]"          // Fixed sidebar width
className="lg:hidden"             // Hide on desktop
className="lg:block"              // Show only on desktop
className="lg:col-span-2"         // Span 2 columns
```

---

## 📱 Your Responsive Grid System

### Found in `components/layout/ResponsiveGrid.tsx`

```typescript
const gridVariants = {
  // Cards grid: 1 → 2 → 3 → 4 → 5 columns
  cards: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  
  // Content grid: 1 → 2 → 3 columns
  content: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  
  // Features: 1 → 2 → 4 columns
  features: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  
  // Gap sizes
  lg: 'gap-4 sm:gap-6 lg:gap-8',
}
```

---

## 🎨 Desktop-Specific Styles in globals.css

### Responsive Typography

```css
/* Mobile → Desktop scaling */
.text-h1 { 
  font-size: 2rem;        /* Mobile: 32px */
}
@media (min-width: 768px) { 
  .text-h1 { 
    font-size: 2.5rem;    /* Desktop: 40px */
  } 
}

.text-price-dominant { 
  font-size: 2.25rem;     /* Mobile: 36px */
}
@media (min-width: 640px) { 
  font-size: 3rem;        /* Tablet: 48px */
}
@media (min-width: 768px) { 
  font-size: 3.5rem;      /* Desktop: 56px */
}
```

---

## 📊 Common Desktop Layouts in Your App

### 1. Ad Detail Page
```tsx
// 1 column mobile → 3 column desktop
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
  <div className="lg:col-span-2">
    {/* Main content - 2/3 width on desktop */}
  </div>
  <div>
    {/* Sidebar - 1/3 width on desktop */}
  </div>
</div>
```

### 2. Ads Listing
```tsx
// 1 → 2 → 3 columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
  {/* Ad cards */}
</div>
```

### 3. Help Page
```tsx
// 1 → 2 → 4 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Feature cards */}
</div>
```

### 4. Mobile-Only Elements
```tsx
// Hidden on desktop (≥1024px)
<div className="lg:hidden">
  {/* Mobile sticky CTA, mobile menu, etc. */}
</div>
```

---

## 🎯 Desktop Width Detection in Code

### CSS Media Queries
```css
@media (min-width: 768px) {
  /* Tablet and up (768px+) */
}

@media (min-width: 1024px) {
  /* Desktop and up (1024px+) */
}
```

### Tailwind Classes
```tsx
// Desktop-specific
className="lg:block"        // Show on desktop (≥1024px)
className="lg:hidden"       // Hide on desktop
className="lg:w-1/2"        // 50% width on desktop
className="lg:flex-row"     // Row layout on desktop
```

---

## 📐 Viewport Sizes Reference

### Your Project's Breakpoints

```
Mobile:        < 640px   (default, no prefix)
Small Tablet:  640px+    (sm:)
Tablet:        768px+    (md:)
Desktop:       1024px+   (lg:)  ← DESKTOP STARTS HERE
Large Desktop: 1280px+   (xl:)
XL Desktop:    1536px+   (2xl:)
```

---

## 🖼️ Image Sizes (next.config.js)

```javascript
deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
```

Desktop image sizes:
- 1080px - Small desktop
- 1200px - Standard desktop
- 1920px - Full HD (1080p)
- 2048px - 2K
- 3840px - 4K

---

## 💡 How to Use Desktop Width

### Show/Hide Elements
```tsx
// Mobile only
<div className="lg:hidden">Mobile menu</div>

// Desktop only
<div className="hidden lg:block">Desktop sidebar</div>
```

### Different Layouts
```tsx
// Stack on mobile, row on desktop
<div className="flex flex-col lg:flex-row">
  <div>Left</div>
  <div>Right</div>
</div>
```

### Responsive Grids
```tsx
// 1 column mobile → 4 columns desktop
<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>
```

### Responsive Spacing
```tsx
// Small padding mobile → large padding desktop
<div className="p-4 lg:p-8">Content</div>

// Small gap mobile → large gap desktop
<div className="gap-4 lg:gap-8">Items</div>
```

---

## 🎨 Your Custom Breakpoint Usage

### Most Common Patterns

```tsx
// Sidebar layouts
"lg:w-[280px]"              // Fixed sidebar width
"lg:col-span-2"             // Span 2 columns

// Grid layouts
"lg:grid-cols-3"            // 3 columns on desktop
"lg:grid-cols-4"            // 4 columns on desktop

// Spacing
"lg:gap-8"                  // Large gaps on desktop
"lg:p-8"                    // Large padding on desktop

// Visibility
"lg:hidden"                 // Hide on desktop
"hidden lg:block"           // Show only on desktop
```

---

## 📱 Mobile-First Approach

Your project uses **mobile-first** design:

```tsx
// ✅ Correct (mobile-first)
className="text-2xl lg:text-4xl"
// Base: 24px (mobile)
// Desktop: 32px (≥1024px)

// ❌ Wrong (desktop-first)
className="lg:text-2xl text-4xl"
```

---

## 🔍 Find Desktop-Specific Code

### Search Commands

```powershell
# Find all lg: classes (desktop)
rg "lg:" frontend/

# Find desktop media queries
rg "@media.*1024" frontend/

# Find desktop-only elements
rg "hidden lg:block" frontend/

# Find desktop grid layouts
rg "lg:grid-cols" frontend/
```

---

## 📊 Summary

| Aspect | Value |
|--------|-------|
| **Desktop Breakpoint** | 1024px (`lg:`) |
| **Large Desktop** | 1280px (`xl:`) |
| **XL Desktop** | 1536px (`2xl:`) |
| **Approach** | Mobile-first |
| **Grid System** | 1-5 columns responsive |

---

## 🎯 Quick Reference

```
Mobile:   < 1024px  → Use base classes
Desktop:  ≥ 1024px  → Use lg: prefix
Large:    ≥ 1280px  → Use xl: prefix
```

**Desktop width in your project**: **1024px+** (Tailwind `lg:` breakpoint)

---

**Your app is running**: http://localhost:3001 ✅