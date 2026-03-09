# Global Colors and Fonts - Design System

## 🎨 Complete Color & Typography Reference

This document provides the complete design system for colors and fonts used throughout the application.

---

## 🎨 Color System

### Primary Colors (Blue)
**Usage**: Main brand color, buttons, links, focus states

```css
--color-primary-50: #eff6ff   /* Lightest - backgrounds */
--color-primary-100: #dbeafe  /* Very light - hover states */
--color-primary-200: #bfdbfe  /* Light - borders */
--color-primary-300: #93c5fd  /* Medium light */
--color-primary-400: #60a5fa  /* Medium */
--color-primary-500: #2563eb  /* Main brand color ⭐ */
--color-primary-600: #1d4ed8  /* Hover state */
--color-primary-700: #1e40af  /* Active state */
--color-primary-800: #1e3a8a  /* Dark */
--color-primary-900: #172554  /* Darkest */
```

**Tailwind Classes**:
- `bg-primary-500` - Main brand background
- `text-primary-600` - Primary text
- `border-primary-500` - Primary border
- `hover:bg-primary-600` - Hover state

---

### Secondary Colors (Yellow/Amber)
**Usage**: Badges, ratings, highlights, warnings

```css
--color-secondary-50: #fffbeb   /* Lightest */
--color-secondary-100: #fef3c7  /* Very light */
--color-secondary-200: #fde68a  /* Light */
--color-secondary-300: #fcd34d  /* Medium light */
--color-secondary-400: #fbbf24  /* Medium */
--color-secondary-500: #f59e0b  /* Main secondary ⭐ */
--color-secondary-600: #d97706  /* Hover */
--color-secondary-700: #b45309  /* Active */
--color-secondary-800: #92400e  /* Dark */
--color-secondary-900: #78350f  /* Darkest */
```

**Tailwind Classes**:
- `bg-secondary-500` - Secondary background
- `text-secondary-600` - Secondary text
- `bg-amber-400` - Rating stars

---

### Neutral Colors (Gray)
**Usage**: Text, borders, backgrounds, UI elements

```css
--color-gray-50: #f9fafb    /* Page background */
--color-gray-100: #f3f4f6   /* Card background */
--color-gray-200: #e5e7eb   /* Subtle borders */
--color-gray-300: #d1d5db   /* Strong borders */
--color-gray-400: #9ca3af   /* Disabled text */
--color-gray-500: #6b7280   /* Muted text ⭐ */
--color-gray-600: #4b5563   /* Secondary text */
--color-gray-700: #374151   /* Body text */
--color-gray-800: #1f2937   /* Dark text */
--color-gray-900: #111827   /* Primary text ⭐ */
```

**Tailwind Classes**:
- `bg-gray-50` - Page background
- `bg-gray-100` - Subtle background
- `text-gray-900` - Primary text
- `text-gray-600` - Secondary text
- `border-gray-200` - Subtle border

---

### Semantic Colors

#### Success (Green)
```css
--color-success: #16a34a        /* Main */
--color-success-bg: #ecfdf3     /* Background */
--color-success-dark: #14532d   /* Dark variant */
```

**Usage**: Success messages, verified badges, positive actions

**Tailwind Classes**:
- `bg-emerald-500` or `bg-success`
- `text-emerald-600`

#### Error (Red)
```css
--color-error: #dc2626          /* Main */
--color-error-bg: #fef2f2       /* Background */
--color-error-dark: #7f1d1d     /* Dark variant */
```

**Usage**: Error messages, delete actions, warnings

**Tailwind Classes**:
- `bg-red-500` or `bg-error`
- `text-red-600`

#### Warning (Amber)
```css
--color-warning: #f59e0b        /* Main */
--color-warning-bg: #fffbeb     /* Background */
--color-warning-dark: #78350f   /* Dark variant */
```

**Usage**: Warning messages, caution states

**Tailwind Classes**:
- `bg-amber-500` or `bg-warning`
- `text-amber-600`

#### Info (Blue)
```css
--color-info: #0284c7           /* Main */
--color-info-bg: #eff6ff        /* Background */
--color-info-dark: #0f172a      /* Dark variant */
```

**Usage**: Info messages, tips, help text

**Tailwind Classes**:
- `bg-sky-600` or `bg-info`
- `text-sky-600`

---

### Text Colors

```css
--color-text-primary: #111827     /* Main headings, important text */
--color-text-secondary: #1f2937   /* Body text, paragraphs */
--color-text-muted: #6b7280       /* Meta info, timestamps */
--color-text-disabled: #9ca3af    /* Disabled elements */
--color-text-on-primary: #ffffff  /* Text on blue background */
```

**Tailwind Classes**:
- `text-gray-900` - Primary text
- `text-gray-800` - Secondary text
- `text-gray-500` - Muted text
- `text-gray-400` - Disabled text
- `text-white` - On primary background

---

### Background Colors

```css
--color-bg-page: #f3f4f6          /* Page background */
--color-bg-card: #ffffff          /* Card background */
--color-bg-subtle: #f9fafb        /* Subtle background */
--color-bg-hover: #f3f4ff         /* Hover state */
--color-bg-highlight: #eff6ff     /* Highlight background */
```

**Tailwind Classes**:
- `bg-gray-50` - Page background
- `bg-white` - Card background
- `bg-gray-100` - Subtle background
- `bg-blue-50` - Highlight

---

### Border Colors

```css
--color-border-subtle: #e5e7eb    /* Subtle borders */
--color-border-strong: #d1d5db    /* Strong borders */
--color-border-focus: #2563eb     /* Focus ring */
```

**Tailwind Classes**:
- `border-gray-200` - Subtle border
- `border-gray-300` - Strong border
- `border-blue-500` - Focus border

---

## 🔤 Typography System

### Font Family

**Primary Font**: **Inter**

```css
font-family: var(--font-inter), 'Inter', system-ui, sans-serif;
```

**Fallback Stack**: `'Inter', system-ui, sans-serif`

**Tailwind Classes**:
- `font-sans` - Default (Inter)
- `font-display` - Display text (Inter)

---

### Font Sizes (8px Scale)

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-2xs` | 10px | 1.4 | Tiny labels |
| `text-xs` | 12px | 1.4 | Small labels, badges |
| `text-sm` | 14px | 1.5 | Body text (small) |
| `text-base` | 16px | 1.5 | Body text (default) ⭐ |
| `text-lg` | 18px | 1.5 | Large body text |
| `text-xl` | 20px | 1.4 | Small headings |
| `text-2xl` | 24px | 1.35 | Card prices |
| `text-3xl` | 28px | 1.3 | Large prices ⭐ |
| `text-4xl` | 32px | 1.25 | Section headings |
| `text-5xl` | 40px | 1.2 | Hero headings |
| `text-6xl` | 48px | 1.15 | Large hero |
| `text-7xl` | 56px | 1.1 | Massive hero |

---

### Heading Styles

#### H1 - Main Page Heading
```css
font-weight: 700 (bold)
font-size: 2rem (mobile) → 2.5rem (desktop)
line-height: 1.2
color: #111827
letter-spacing: -0.02em
```

**Tailwind**: `text-h1` or `text-4xl font-bold text-gray-900`

#### H2 - Section Heading
```css
font-weight: 700 (bold)
font-size: 1.75rem (mobile) → 2rem (desktop)
line-height: 1.25
color: #111827
```

**Tailwind**: `text-h2` or `text-3xl font-bold text-gray-900`

#### H3 - Subsection Heading
```css
font-weight: 700 (bold)
font-size: 1.5rem (mobile) → 1.75rem (desktop)
line-height: 1.3
color: #111827
```

**Tailwind**: `text-h3` or `text-2xl font-bold text-gray-900`

#### H4 - Card Heading
```css
font-weight: 600 (semibold)
font-size: 1.25rem (mobile) → 1.5rem (desktop)
line-height: 1.35
color: #111827
```

**Tailwind**: `text-h4` or `text-xl font-semibold text-gray-900`

#### H5 - Small Heading
```css
font-weight: 600 (semibold)
font-size: 1.125rem (mobile) → 1.25rem (desktop)
line-height: 1.4
color: #111827
```

**Tailwind**: `text-h5` or `text-lg font-semibold text-gray-900`

#### H6 - Tiny Heading
```css
font-weight: 600 (semibold)
font-size: 1rem (mobile) → 1.125rem (desktop)
line-height: 1.5
color: #111827
```

**Tailwind**: `text-h6` or `text-base font-semibold text-gray-900`

---

### Price Styles

#### Dominant Price (Product Detail)
```css
font-weight: 700 (bold)
font-size: 2.25rem (mobile) → 3.5rem (desktop)
line-height: 1.1
color: #111827
letter-spacing: -0.03em
```

**Tailwind**: `text-price-dominant`

#### Large Price
```css
font-weight: 700 (bold)
font-size: 1.875rem (mobile) → 2.25rem (desktop)
line-height: 1.15
color: #111827
```

**Tailwind**: `text-price-lg` or `text-3xl font-bold`

#### Medium Price (Card Price)
```css
font-weight: 700 (bold)
font-size: 1.5rem (mobile) → 1.875rem (desktop)
line-height: 1.25
color: #111827
```

**Tailwind**: `text-price` or `text-2xl font-bold`

#### Small Price
```css
font-weight: 600 (semibold)
font-size: 1.125rem (mobile) → 1.25rem (desktop)
line-height: 1.35
color: #111827
```

**Tailwind**: `text-price-sm` or `text-lg font-semibold`

---

### Body Text Styles

#### Large Body
```css
font-size: 1rem (mobile) → 1.125rem (desktop)
line-height: 1.625
color: #1f2937
```

**Tailwind**: `text-body-lg` or `text-base text-gray-800`

#### Regular Body (Default)
```css
font-size: 0.875rem (mobile) → 1rem (desktop)
line-height: 1.5
color: #1f2937
```

**Tailwind**: `text-body` or `text-sm text-gray-800`

#### Small Body
```css
font-size: 0.75rem (mobile) → 0.875rem (desktop)
line-height: 1.5
color: #374151
```

**Tailwind**: `text-body-sm` or `text-xs text-gray-700`

---

### Meta/Caption Text

#### Meta Text
```css
font-size: 0.75rem (12px)
line-height: 1.4
color: #6b7280
```

**Tailwind**: `text-meta` or `text-xs text-gray-500`

#### Small Meta
```css
font-size: 0.625rem (mobile) → 0.75rem (desktop)
line-height: 1.4
color: #6b7280
```

**Tailwind**: `text-meta-sm` or `text-2xs text-gray-500`

#### Caption/Overline
```css
font-size: 0.625rem (mobile) → 0.75rem (desktop)
color: #6b7280
text-transform: uppercase
letter-spacing: 0.08em
```

**Tailwind**: `text-caption` or `text-2xs uppercase tracking-wider text-gray-500`

---

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Regular text |
| `font-medium` | 500 | Slightly emphasized |
| `font-semibold` | 600 | Subheadings, labels |
| `font-bold` | 700 | Headings, prices ⭐ |
| `font-extrabold` | 800 | Hero text |
| `font-black` | 900 | Extra emphasis |

---

## 🎯 Common Use Cases

### Card Title
```jsx
<h3 className="text-lg font-bold text-gray-900 line-clamp-2">
  Product Title Here
</h3>
```

### Card Price
```jsx
<span className="text-3xl font-bold text-gray-900">
  ₹ 25,000
</span>
```

### Body Text
```jsx
<p className="text-base text-gray-700 leading-relaxed">
  Description text here
</p>
```

### Meta Info
```jsx
<span className="text-sm text-gray-500">
  Posted 2 hours ago
</span>
```

### Primary Button
```jsx
<button className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg">
  Click Me
</button>
```

### Secondary Button
```jsx
<button className="bg-white hover:bg-gray-50 text-gray-900 font-semibold px-6 py-3 rounded-lg border border-gray-300">
  Cancel
</button>
```

### Success Badge
```jsx
<span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold">
  Verified
</span>
```

### Warning Badge
```jsx
<span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold">
  Urgent
</span>
```

---

## 🎨 Color Combinations

### Primary Button
- **Background**: `bg-primary-600` (#1d4ed8)
- **Text**: `text-white` (#ffffff)
- **Hover**: `hover:bg-primary-700` (#1e40af)

### Card
- **Background**: `bg-white` (#ffffff)
- **Border**: `border border-gray-200` (#e5e7eb)
- **Hover Border**: `hover:border-blue-300` (#93c5fd)

### Input Field
- **Background**: `bg-white` (#ffffff)
- **Border**: `border border-gray-300` (#d1d5db)
- **Focus Border**: `focus:border-primary-500` (#2563eb)
- **Focus Ring**: `focus:ring-2 focus:ring-primary-200` (#bfdbfe)

---

## 📐 Spacing Scale

| Class | Size | Usage |
|-------|------|-------|
| `p-1` | 4px | Tiny padding |
| `p-2` | 8px | Small padding |
| `p-3` | 12px | Medium padding |
| `p-4` | 16px | Default padding ⭐ |
| `p-5` | 20px | Large padding ⭐ |
| `p-6` | 24px | Extra large padding |
| `p-8` | 32px | Section padding |
| `p-10` | 40px | Large section padding |

---

## 🎯 Border Radius

| Class | Size | Usage |
|-------|------|-------|
| `rounded` | 4px | Small elements |
| `rounded-md` | 6px | Medium elements |
| `rounded-lg` | 8px | Buttons, inputs |
| `rounded-xl` | 12px | Cards ⭐ |
| `rounded-2xl` | 16px | Large cards ⭐ |
| `rounded-3xl` | 24px | Hero sections |
| `rounded-full` | 9999px | Pills, avatars |

---

## 🎨 Shadow Scale

| Class | Shadow | Usage |
|-------|--------|-------|
| `shadow-sm` | Subtle | Subtle elevation |
| `shadow` | Small | Small cards |
| `shadow-md` | Medium | Cards ⭐ |
| `shadow-lg` | Large | Modals |
| `shadow-xl` | Extra large | Hover states ⭐ |
| `shadow-2xl` | Massive | Dropdowns |

---

## ✅ Accessibility

### Color Contrast (WCAG AA)

All text colors meet WCAG AA standards:

- **Primary text** (`text-gray-900`) on white: **15.8:1** ✅
- **Secondary text** (`text-gray-700`) on white: **10.7:1** ✅
- **Muted text** (`text-gray-500`) on white: **4.6:1** ✅
- **White text** on `bg-primary-600`: **6.2:1** ✅

### Focus States

All interactive elements have visible focus states:

```css
focus:outline-none
focus:ring-2
focus:ring-primary-500
focus:ring-offset-2
```

---

## 🎉 Quick Reference

### Most Used Colors:
- **Primary**: `bg-primary-600` (#1d4ed8)
- **Text**: `text-gray-900` (#111827)
- **Background**: `bg-gray-50` (#f9fafb)
- **Border**: `border-gray-200` (#e5e7eb)

### Most Used Font Sizes:
- **Body**: `text-base` (16px)
- **Small**: `text-sm` (14px)
- **Heading**: `text-2xl` (24px)
- **Price**: `text-3xl` (28px)

### Most Used Spacing:
- **Card Padding**: `p-5` (20px)
- **Section Margin**: `mb-12` (48px)
- **Gap**: `gap-4` (16px)

---

**Status**: ✅ Complete Design System  
**Last Updated**: 2026-02-27  
**Font**: Inter (Google Fonts)  
**Primary Color**: Blue (#2563eb)  
**Secondary Color**: Amber (#f59e0b)  

**Use this guide for consistent design across the entire application!** 🎨
