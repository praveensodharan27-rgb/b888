# 📱 Responsive Categories Navigation Bar

## Overview

A fully responsive category navigation bar for the marketplace with different behaviors for desktop and mobile devices.

## ✨ Features

### Desktop (≥768px)
- **9 visible category buttons** dynamically selected by ad count
- **"All Categories" dropdown** containing remaining categories
- **Randomized dropdown order** on each page load
- **Smooth hover dropdown** interaction
- **Active state support** for current category

### Mobile (<768px)
- **3 fixed categories** always shown first:
  1. Cars 🚗
  2. Bikes 🚊
  3. Motorcycles 🏍️
- **Fixed order** - these never change position
- **Horizontal scrollable** for remaining categories
- **Touch-friendly** buttons with proper spacing

## 🎯 Logic

### Desktop Category Selection

```typescript
// Top 9 categories by ad count
const sortedByAdCount = [...allCategories].sort((a, b) => {
  const countA = a._count?.ads || 0;
  const countB = b._count?.ads || 0;
  return countB - countA;
});

const visibleCategories = sortedByAdCount.slice(0, 9);
const dropdownCategories = shuffleArray(sortedByAdCount.slice(9));
```

### Mobile Category Selection

```typescript
// Fixed categories first
const fixedSlugs = ['cars', 'bikes', 'motorcycles'];
const fixed = fixedSlugs.map(slug => 
  allCategories.find(cat => cat.slug === slug)
).filter(Boolean);

// Remaining categories (scrollable)
const remaining = allCategories.filter(cat => 
  !fixedSlugs.includes(cat.slug)
);
```

### Shuffle Function

```typescript
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

## 🎨 UI Components

### Category Button

```tsx
<Link
  href={`/?category=${category.slug}`}
  className={`
    flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium
    transition-all duration-200 whitespace-nowrap hover:shadow-sm
    ${isActive 
      ? 'bg-blue-600 text-white shadow-md' 
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }
  `}
>
  {category.icon && <span className="mr-1.5">{category.icon}</span>}
  {category.name}
</Link>
```

### Desktop Dropdown

```tsx
<button
  onClick={() => setShowMegaMenu(!showMegaMenu)}
  onMouseEnter={() => setShowMegaMenu(true)}
  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm 
             font-semibold text-white bg-blue-600 hover:bg-blue-700"
>
  <FiGrid className="w-4 h-4" />
  <span>All Categories</span>
  <FiChevronDown className={`w-4 h-4 transition-transform 
                             ${showMegaMenu ? 'rotate-180' : ''}`} />
</button>

{showMegaMenu && (
  <div className="absolute top-full right-0 mt-2 w-72 bg-white 
                  rounded-lg shadow-2xl border max-h-96 overflow-y-auto">
    {dropdownCategories.map(category => (
      <Link href={`/?category=${category.slug}`}>
        {category.icon} {category.name}
      </Link>
    ))}
  </div>
)}
```

## 📐 Styling

### Desktop Layout
```css
.desktop-nav {
  max-width: 1280px; /* max-w-7xl */
  margin: 0 auto;
  padding: 0 1rem;
  height: 3rem; /* h-12 */
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
```

### Mobile Layout
```css
.mobile-nav {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.mobile-nav::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}
```

### Button Styles
```css
.category-button {
  padding: 0.5rem 0.75rem; /* px-3 py-2 */
  border-radius: 0.5rem; /* rounded-lg */
  font-size: 0.875rem; /* text-sm */
  font-weight: 500; /* font-medium */
  white-space: nowrap;
  transition: all 0.2s;
}

.category-button.active {
  background: #2563eb; /* bg-blue-600 */
  color: white;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.category-button.inactive {
  background: #f3f4f6; /* bg-gray-100 */
  color: #374151; /* text-gray-700 */
}

.category-button:hover {
  background: #e5e7eb; /* hover:bg-gray-200 */
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
```

## 🔧 Technical Implementation

### Component Structure

```
CategoryNav
├── Desktop View (hidden md:block)
│   ├── 9 Visible Categories
│   └── All Categories Dropdown
│       └── Remaining Categories (shuffled)
└── Mobile View (md:hidden)
    ├── Fixed Categories (Cars, Bikes, Motorcycles)
    └── Scrollable Categories (rest)
```

### State Management

```typescript
const [showMegaMenu, setShowMegaMenu] = useState(false);
const [activeCategorySlug, setActiveCategorySlug] = useState<string>('');
const megaMenuRef = useRef<HTMLDivElement>(null);
const scrollContainerRef = useRef<HTMLDivElement>(null);
```

### Data Fetching

```typescript
const { categories: allCategories, isLoading } = useCategories();
```

### Memoized Computations

```typescript
const { visibleCategories, dropdownCategories } = useMemo(() => {
  // Desktop: Top 9 + shuffled rest
}, [allCategories]);

const { mobileFixedCategories, mobileScrollableCategories } = useMemo(() => {
  // Mobile: Fixed 3 + rest
}, [allCategories]);
```

## 📱 Responsive Breakpoints

| Screen Size | Behavior | Categories Shown |
|-------------|----------|------------------|
| **< 768px (Mobile)** | Horizontal scroll | Fixed 3 + All scrollable |
| **≥ 768px (Desktop)** | Fixed layout | Top 9 + Dropdown |

## 🎯 User Interactions

### Desktop
1. **Hover** on "All Categories" → Dropdown opens
2. **Click** category → Navigate & set active
3. **Mouse leave** dropdown → Dropdown closes
4. **Click outside** → Dropdown closes

### Mobile
1. **Tap** category → Navigate & set active
2. **Swipe** horizontally → Scroll through categories
3. **Auto-scroll** to active category

## 🔄 Dynamic Updates

### Category Order Updates
- **Desktop**: Recalculates top 9 when ad counts change
- **Mobile**: Fixed categories always stay first
- **Dropdown**: Reshuffles on each component mount

### Active State
- Syncs with URL parameters
- Auto-scrolls to active category on mobile
- Visual highlight with blue background

## 🎨 Design Tokens

```typescript
const colors = {
  active: {
    bg: 'bg-blue-600',
    text: 'text-white',
    shadow: 'shadow-md'
  },
  inactive: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    hover: 'hover:bg-gray-200'
  },
  dropdown: {
    bg: 'bg-white',
    border: 'border-gray-200',
    hover: 'hover:bg-gray-50'
  }
};

const spacing = {
  buttonPadding: 'px-3 py-2',
  gap: 'gap-2',
  height: 'h-12'
};

const typography = {
  button: 'text-sm font-medium',
  dropdown: 'text-sm font-medium'
};
```

## 🚀 Performance Optimizations

1. **useMemo** for expensive computations
2. **memo** wrapper for component
3. **React Query** caching for categories
4. **CSS-only** scrollbar hiding
5. **Smooth scroll** behavior

## ✅ Accessibility

- ✅ Semantic HTML (`<nav>`, `<button>`, `<Link>`)
- ✅ ARIA labels (`aria-label`, `aria-expanded`, `aria-haspopup`)
- ✅ Keyboard navigation support
- ✅ Focus states
- ✅ Role attributes (`role="menu"`, `role="menuitem"`)

## 🧪 Testing Checklist

### Desktop
- [ ] Shows exactly 9 categories
- [ ] Dropdown opens on hover
- [ ] Dropdown closes on mouse leave
- [ ] Dropdown closes on click outside
- [ ] Categories in dropdown are randomized
- [ ] Active state highlights correctly
- [ ] Navigation works (Ctrl+Click for new tab)

### Mobile
- [ ] Shows Cars, Bikes, Motorcycles first
- [ ] Fixed categories don't change order
- [ ] Horizontal scroll works smoothly
- [ ] Auto-scrolls to active category
- [ ] Touch targets are adequate (44px min)
- [ ] Scrollbar is hidden

### Both
- [ ] Loading state shows skeleton
- [ ] Categories fetch from API
- [ ] Active state syncs with URL
- [ ] Icons display correctly
- [ ] Ad counts show when available

## 📝 Usage Example

```tsx
import CategoryNav from '@/components/CategoryNav';

export default function Layout() {
  return (
    <div>
      <Header />
      <CategoryNav />
      <main>{children}</main>
    </div>
  );
}
```

## 🔗 Related Files

- `frontend/components/CategoryNav.tsx` - Main component
- `frontend/hooks/useCategories.ts` - Categories hook
- `frontend/lib/api.ts` - API client
- `backend/routes/categories.js` - Categories API endpoint

## 📊 Current Categories (Top 12)

Based on ad count:
1. Mobiles (142 ads)
2. Commercial & Industrial (138 ads)
3. Fashion (136 ads)
4. Properties (133 ads)
5. Free Stuff (121 ads)
6. Services (120 ads)
7. Electronics & Appliances (119 ads)
8. Jobs (118 ads)
9. Other / Misc (117 ads)
10. Home & Furniture (116 ads)
11. Books, Sports & Hobbies (111 ads)
12. Baby & Kids (111 ads)

**Desktop shows:** Top 9 (Mobiles → Other/Misc)
**Desktop dropdown:** Remaining 6 (shuffled)
**Mobile shows:** Cars, Bikes, Motorcycles + All others (scrollable)

## 🎉 Summary

This responsive category navigation provides:
- ✅ **9 dynamic categories** on desktop
- ✅ **Randomized dropdown** for remaining categories
- ✅ **3 fixed categories** on mobile (Cars, Bikes, Motorcycles)
- ✅ **Smooth interactions** (hover dropdown, horizontal scroll)
- ✅ **Active state support** with URL sync
- ✅ **Fully responsive** design
- ✅ **TypeScript typed** with proper interfaces
- ✅ **Tailwind styled** with modern aesthetics
