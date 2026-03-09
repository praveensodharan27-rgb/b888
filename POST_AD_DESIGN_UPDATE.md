# Post Ad Page - Design System Update

## 🎯 Changes to Apply

### Color Updates
Replace **Orange** → **Primary Blue**

| Old (Orange) | New (Primary Blue) | Usage |
|--------------|-------------------|--------|
| `text-orange-600` | `text-primary-600` | Section numbers, highlights |
| `bg-orange-500` | `bg-primary-600` | Primary buttons |
| `bg-orange-600` | `bg-primary-700` | Button hover |
| `border-orange-500` | `border-primary-500` | Focus states |
| `ring-orange-500` | `ring-primary-500` | Focus rings |
| `from-orange-500` | `from-primary-600` | Gradients |
| `to-orange-600` | `to-primary-700` | Gradients |

### Typography Updates

| Old | New | Usage |
|-----|-----|-------|
| `text-xl font-semibold` | `text-h5` | Section headings |
| `text-2xl font-bold` | `text-h4` | Main headings |
| `text-sm font-medium` | `text-body` | Labels |
| `text-base` | `text-body-lg` | Body text |

### Component Updates

#### Cards
```jsx
// BEFORE
<div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">

// AFTER
<div className="bg-white rounded-xl p-5 shadow-md border border-gray-200">
```

#### Buttons
```jsx
// BEFORE
<button className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg">

// AFTER
<button className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg">
```

#### Input Fields
```jsx
// BEFORE
<input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">

// AFTER
<input className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
```

## 🎨 Design System Values

### Primary Color (Blue)
- `--color-primary-500`: #2563eb
- `--color-primary-600`: #1d4ed8 (Main)
- `--color-primary-700`: #1e40af (Hover)

### Typography
- **Font**: Inter
- **Headings**: `text-h1` to `text-h6`
- **Body**: `text-body`, `text-body-lg`, `text-body-sm`
- **Meta**: `text-meta`, `text-caption`

### Spacing
- **Card padding**: `p-5` (20px)
- **Section margin**: `mb-6` (24px)
- **Gap**: `gap-4` (16px)

### Border Radius
- **Cards**: `rounded-xl` (12px)
- **Buttons**: `rounded-lg` (8px)
- **Inputs**: `rounded-lg` (8px)

### Shadows
- **Cards**: `shadow-md`
- **Hover**: `shadow-xl`

## 📋 Implementation Checklist

- [x] Section 1: Category & Subcategory
- [ ] Section 2: Ad Details
- [ ] Section 3: Product Specifications
- [ ] Section 4: Upload Photos
- [ ] Section 5: Premium Options
- [ ] Submit Button
- [ ] All input fields
- [ ] All select dropdowns
- [ ] All error messages
- [ ] All helper text

## 🚀 Expected Result

### Before
- Orange accent colors
- Mixed font sizes
- Inconsistent spacing
- `rounded-lg` cards
- `shadow-sm` shadows

### After
- Primary blue accent colors
- Consistent typography (Inter, text-h5, text-body)
- Consistent spacing (p-5, gap-4)
- `rounded-xl` cards
- `shadow-md` shadows
- Matches global design system

---

**Status**: In Progress  
**File**: `frontend/app/post-ad/page.tsx`
