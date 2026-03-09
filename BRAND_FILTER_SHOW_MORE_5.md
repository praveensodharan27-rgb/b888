# ✅ Brand Filter - Show More (5 at a time)

## 🎯 How It Works

### Initial Display
- Shows **5 brands** initially
- Clean, compact interface

### Click "Show More"
- Shows **5 more brands** (total 10)
- Click again → Shows **5 more** (total 15)
- Click again → Shows **5 more** (total 20)
- Continue until all brands shown

### Click "Show Less"
- Collapses back to **5 brands**
- Resets to initial state

---

## 📊 Visual Flow

### Step 1: Initial (5 brands)
```
┌─────────────────────────┐
│ BRAND                   │
├─────────────────────────┤
│ ☐ Apple                 │
│ ☐ Samsung               │
│ ☐ Xiaomi                │
│ ☐ OnePlus               │
│ ☐ Realme                │
├─────────────────────────┤
│ [Show More (5 more)]    │ ← Shows next 5
└─────────────────────────┘
```

### Step 2: After 1st Click (10 brands)
```
┌─────────────────────────┐
│ BRAND                   │
├─────────────────────────┤
│ ☐ Apple                 │
│ ☐ Samsung               │
│ ☐ Xiaomi                │
│ ☐ OnePlus               │
│ ☐ Realme                │
│ ☐ Vivo                  │ ← New
│ ☐ Oppo                  │ ← New
│ ☐ Motorola              │ ← New
│ ☐ Nokia                 │ ← New
│ ☐ Google                │ ← New
├─────────────────────────┤
│ [Show More (5 more)]    │ ← Shows next 5
│ [Show Less]             │ ← Collapse to 5
└─────────────────────────┘
```

### Step 3: After 2nd Click (15 brands)
```
┌─────────────────────────┐
│ BRAND                   │
├─────────────────────────┤
│ ☐ Apple                 │
│ ☐ Samsung               │
│ ... (10 brands)         │
│ ☐ Sony                  │ ← New
│ ☐ Asus                  │ ← New
│ ☐ Lenovo                │ ← New
│ ☐ Huawei                │ ← New
│ ☐ Honor                 │ ← New
├─────────────────────────┤
│ [Show More (5 more)]    │ ← Shows next 5
│ [Show Less]             │ ← Collapse to 5
└─────────────────────────┘
```

### Step 4: All Shown (20 brands)
```
┌─────────────────────────┐
│ BRAND                   │
├─────────────────────────┤
│ ☐ Apple                 │
│ ... (all 20 brands)     │
│ ☐ Lava                  │
├─────────────────────────┤
│ [Show Less]             │ ← Collapse to 5
└─────────────────────────┘
```

---

## 💻 Code Implementation

### State Management
```typescript
const [visibleCount, setVisibleCount] = useState(5);
```

### Show More Logic
```typescript
const filteredBrands = useMemo(() => {
  const filtered = searchQuery 
    ? brands.filter(brand => brand.toLowerCase().includes(query))
    : brands;
  
  // Show all when searching, otherwise limit by visibleCount
  if (searchQuery) {
    return filtered;
  }
  return filtered.slice(0, visibleCount);
}, [brands, searchQuery, visibleCount]);

const hasMore = !searchQuery && brands.length > visibleCount;
const remainingCount = brands.length - visibleCount;
```

### Show More Button
```tsx
{hasMore && (
  <button onClick={() => setVisibleCount(prev => prev + 5)}>
    Show More ({remainingCount > 5 ? '5' : remainingCount} more)
  </button>
)}
```

### Show Less Button
```tsx
{visibleCount > 5 && (
  <button onClick={() => setVisibleCount(5)}>
    Show Less
  </button>
)}
```

---

## 🎯 Features

### 1. Progressive Loading
- Start with 5 brands
- Load 5 more each click
- User controls pace

### 2. Smart Button Text
- "Show More (5 more)" - When 5+ remaining
- "Show More (3 more)" - When 3 remaining
- "Show Less" - When expanded

### 3. Search Override
- When searching, shows all matches
- No pagination during search
- "Show More" hidden

### 4. Reset on Collapse
- "Show Less" resets to 5
- Clean state management
- Predictable behavior

---

## 📱 Mobile UX Benefits

### 1. Less Scrolling
- Only 5 brands initially
- User scrolls less
- Faster to scan

### 2. Progressive Disclosure
- Show what's needed
- Load more on demand
- User controls content

### 3. Better Performance
- Fewer DOM elements
- Faster rendering
- Smoother scrolling

### 4. Clear Feedback
- Button shows exact count
- "5 more" is clear
- User knows what to expect

---

## 🎨 Button Styling

### Show More Button (Primary)
- **Text**: `text-primary-600` (Blue)
- **Background**: Transparent → `hover:bg-primary-50`
- **Border**: `border-primary-200` → `hover:border-primary-300`
- **Font**: Semibold, 14px

### Show Less Button (Secondary)
- **Text**: `text-gray-600` (Gray)
- **Background**: Transparent → `hover:bg-gray-50`
- **Border**: `border-gray-200` → `hover:border-gray-300`
- **Font**: Semibold, 14px

---

## 📊 Example Flow

### Scenario: 20 brands available

**Initial**: 5 visible
```
Visible: 5
Remaining: 15
Button: "Show More (5 more)"
```

**After 1st click**: 10 visible
```
Visible: 10
Remaining: 10
Button: "Show More (5 more)"
```

**After 2nd click**: 15 visible
```
Visible: 15
Remaining: 5
Button: "Show More (5 more)"
```

**After 3rd click**: 20 visible
```
Visible: 20
Remaining: 0
Button: "Show Less" (no Show More)
```

**After "Show Less"**: Back to 5
```
Visible: 5
Remaining: 15
Button: "Show More (5 more)"
```

---

## ✅ Result

The brand filter now:
- ✅ Shows **5 brands** initially
- ✅ **"Show More"** loads **5 more** at a time
- ✅ **"Show Less"** collapses back to 5
- ✅ Shows exact count: "Show More (5 more)"
- ✅ Progressive loading for better UX
- ✅ Cleaner, more manageable interface

---

**Status**: ✅ **COMPLETE**  
**File**: `frontend/components/filters/BrandFilterCard.tsx`  
**Behavior**: Shows 5 initially, loads 5 more each click  
**Result**: Better mobile UX, progressive disclosure  

**The brand filter now loads 5 more brands at a time!** 🎉📱
