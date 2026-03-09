# Design System - Quick Reference Card

## 🎨 Colors

### Primary (Blue)
```
50:  #eff6ff  100: #dbeafe  200: #bfdbfe
300: #93c5fd  400: #60a5fa  500: #2563eb ⭐
600: #1d4ed8  700: #1e40af  800: #1e3a8a
```

### Gray
```
50:  #f9fafb  100: #f3f4f6  200: #e5e7eb
300: #d1d5db  400: #9ca3af  500: #6b7280
600: #4b5563  700: #374151  800: #1f2937  900: #111827 ⭐
```

### Semantic
```
Success:  #16a34a (emerald-600)
Error:    #dc2626 (red-600)
Warning:  #f59e0b (amber-500)
Info:     #0284c7 (sky-600)
```

---

## 🔤 Typography

### Font
```
Primary: Inter
Fallback: system-ui, sans-serif
```

### Sizes
```
xs:   12px  sm:   14px  base: 16px ⭐
lg:   18px  xl:   20px  2xl:  24px
3xl:  28px  4xl:  32px  5xl:  40px
```

### Weights
```
normal:    400  medium:  500  semibold: 600
bold:      700 ⭐ extrabold: 800  black: 900
```

---

## 📏 Common Patterns

### Card
```jsx
<div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
  {/* Content */}
</div>
```

### Button (Primary)
```jsx
<button className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg">
  Click Me
</button>
```

### Button (Secondary)
```jsx
<button className="bg-white hover:bg-gray-50 text-gray-900 font-semibold px-6 py-3 rounded-lg border border-gray-300">
  Cancel
</button>
```

### Input
```jsx
<input className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200" />
```

### Badge
```jsx
<span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">
  Verified
</span>
```

---

## 📊 Spacing

```
p-1: 4px   p-2: 8px   p-3: 12px  p-4: 16px
p-5: 20px ⭐ p-6: 24px  p-8: 32px  p-10: 40px

gap-2: 8px   gap-3: 12px  gap-4: 16px ⭐
gap-5: 20px  gap-6: 24px  gap-8: 32px
```

---

## 🎯 Border Radius

```
rounded:    4px   rounded-md:  6px
rounded-lg: 8px   rounded-xl:  12px ⭐
rounded-2xl: 16px ⭐ rounded-3xl: 24px
rounded-full: 9999px
```

---

## 💫 Shadows

```
shadow-sm:  Subtle
shadow-md:  Cards ⭐
shadow-lg:  Modals
shadow-xl:  Hover ⭐
shadow-2xl: Dropdowns
```

---

## 🎨 Text Colors

```
text-gray-900: Primary text ⭐
text-gray-700: Secondary text
text-gray-500: Muted text
text-gray-400: Disabled text
text-white:    On primary bg
```

---

## 📱 Grid Layouts

### 4 Cards Per Line
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
  {/* Cards */}
</div>
```

### 3 Cards Per Line
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
  {/* Cards */}
</div>
```

### 2 Cards Per Line
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
  {/* Cards */}
</div>
```

---

## 🎯 Common Components

### Card Title
```jsx
<h3 className="text-lg font-bold text-gray-900 line-clamp-2">
  Title Here
</h3>
```

### Card Price
```jsx
<span className="text-3xl font-bold text-gray-900">
  ₹ 25,000
</span>
```

### Meta Info
```jsx
<span className="text-sm text-gray-500">
  2 hours ago
</span>
```

### Section Heading
```jsx
<h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
  Section Title
</h2>
```

---

## ✅ Quick Checklist

### Card Design:
- ✅ `bg-white`
- ✅ `rounded-xl` or `rounded-2xl`
- ✅ `shadow-md`
- ✅ `border border-gray-200`
- ✅ `p-5` padding

### Button Design:
- ✅ `bg-primary-600`
- ✅ `hover:bg-primary-700`
- ✅ `text-white`
- ✅ `font-semibold`
- ✅ `px-6 py-3`
- ✅ `rounded-lg`

### Text Hierarchy:
- ✅ Headings: `font-bold text-gray-900`
- ✅ Body: `text-base text-gray-700`
- ✅ Meta: `text-sm text-gray-500`

### Spacing:
- ✅ Card padding: `p-5`
- ✅ Section margin: `mb-12`
- ✅ Grid gap: `gap-4 sm:gap-5 lg:gap-6`

---

## 🎨 Color Usage Guide

### When to Use:

**Primary Blue**:
- Buttons (CTAs)
- Links
- Focus states
- Icons (active)

**Gray**:
- Text (all levels)
- Borders
- Backgrounds
- Disabled states

**Emerald (Green)**:
- Success messages
- Verified badges
- Positive actions

**Red**:
- Error messages
- Delete actions
- Urgent badges

**Amber**:
- Warnings
- Ratings (stars)
- Highlights

---

## 📐 Responsive Patterns

### Container:
```jsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content */}
</div>
```

### Responsive Text:
```jsx
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
  Heading
</h1>
```

### Responsive Padding:
```jsx
<div className="p-4 sm:p-5 lg:p-6">
  {/* Content */}
</div>
```

### Responsive Gap:
```jsx
<div className="gap-4 sm:gap-5 lg:gap-6">
  {/* Items */}
</div>
```

---

## 🎯 Most Used Classes

### Top 10:
1. `text-gray-900` - Primary text
2. `bg-white` - Card background
3. `rounded-xl` - Border radius
4. `shadow-md` - Card shadow
5. `p-5` - Card padding
6. `gap-4` - Grid gap
7. `text-base` - Body text
8. `font-bold` - Headings
9. `border-gray-200` - Borders
10. `hover:bg-primary-700` - Button hover

---

## 💡 Pro Tips

### DO:
✅ Use `text-gray-900` for headings  
✅ Use `p-5` for card padding  
✅ Use `rounded-xl` for cards  
✅ Use `gap-4 sm:gap-5 lg:gap-6` for grids  
✅ Use `text-3xl font-bold` for prices  

### DON'T:
❌ Don't use fixed widths (`w-[300px]`)  
❌ Don't use arbitrary colors  
❌ Don't mix font families  
❌ Don't skip responsive classes  
❌ Don't use inline styles  

---

## 🎨 Brand Colors

```
Primary:   #2563eb (Blue 600)
Secondary: #f59e0b (Amber 500)
Success:   #16a34a (Emerald 600)
Error:     #dc2626 (Red 600)
Warning:   #f59e0b (Amber 500)
```

---

## 📱 Breakpoints

```
sm:  640px  (Tablet)
md:  768px  (Small Desktop)
lg:  1024px (Desktop) ⭐
xl:  1280px (Large Desktop)
2xl: 1536px (Extra Large)
```

---

**Quick Access**: Bookmark this page for instant reference! 🎨
