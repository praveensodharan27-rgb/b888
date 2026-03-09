# Typography System

Modern typography using **Inter** font, **8px type scale**, clear hierarchy, dominant price styling, and responsive mobile/desktop text.

---

## Figma Styles

Create these text styles in Figma to match the implementation:

| Style Name | Font | Size (px) | Weight | Line Height | Letter Spacing | Color |
|------------|------|-----------|--------|-------------|----------------|-------|
| **Display / H1** | Inter | 32 / 40 | Bold (700) | 1.2 | -2% | #111827 |
| **Display / H2** | Inter | 28 / 32 | Bold (700) | 1.25 | -2% | #111827 |
| **Display / H3** | Inter | 24 / 28 | Bold (700) | 1.3 | -2% | #111827 |
| **Display / H4** | Inter | 20 / 24 | Semibold (600) | 1.35 | 0 | #111827 |
| **Display / H5** | Inter | 18 / 20 | Semibold (600) | 1.4 | 0 | #111827 |
| **Display / H6** | Inter | 16 / 18 | Semibold (600) | 1.5 | 0 | #111827 |
| **Price / Dominant** | Inter | 36 / 48 / 56 | Bold (700) | 1.1 | -3% | #111827 |
| **Price / Large** | Inter | 30 / 36 | Bold (700) | 1.15 | -2% | #111827 |
| **Price / Default** | Inter | 24 / 30 | Bold (700) | 1.25 | -2% | #111827 |
| **Price / Small** | Inter | 18 / 20 | Semibold (600) | 1.35 | 0 | #111827 |
| **Body / Large** | Inter | 16 / 18 | Regular (400) | 1.625 | 0 | #1f2937 |
| **Body / Default** | Inter | 14 / 16 | Regular (400) | 1.5 | 0 | #1f2937 |
| **Body / Small** | Inter | 12 / 14 | Regular (400) | 1.5 | 0 | #374151 |
| **Meta / Default** | Inter | 12 | Regular (400) | 1.4 | 0 | #6b7280 |
| **Meta / Small** | Inter | 10 / 12 | Regular (400) | 1.4 | 0 | #6b7280 |
| **Button / Default** | Inter | 12 | Semibold (600) | 1.4 | 5% | Inherit |
| **Button / Large** | Inter | 14 | Semibold (600) | 1.4 | 5% | Inherit |
| **Caption / Overline** | Inter | 10 / 12 | Regular (400) | 1.4 | 8% | #6b7280 |

**Responsive notes:** First value = mobile (default), second = desktop (768px+). For Price/Dominant: mobile 36px → tablet 48px → desktop 56px.

**Tabular numbers:** Use for all price styles (OpenType `tnum` / font-variant-numeric: tabular-nums).

---

## 8px Type Scale

| Token | Mobile | Desktop | Usage |
|-------|--------|---------|-------|
| 2xs | 10px | — | Caption, meta-sm |
| xs | 12px | 12px | Meta, button label |
| sm | 14px | 14px | Body default |
| base | 16px | 16px | Body, H6 |
| lg | 18px | 18px | Body large, price-sm |
| xl | 20px | 20px | H5 |
| 2xl | 24px | 24px | H4, price |
| 3xl | 28px | 28px | H3 |
| 4xl | 32px | 32px | H2 |
| 5xl | 40px | 40px | H1 |
| 6xl | 48px | 48px | Price dominant (tablet) |
| 7xl | 56px | 56px | Price dominant (desktop) |

---

## Tailwind Config

```js
// tailwind.config.js (excerpt)
fontFamily: {
  sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
  display: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
},
fontSize: {
  '2xs': ['10px', { lineHeight: '1.4' }],
  xs: ['12px', { lineHeight: '1.4' }],
  sm: ['14px', { lineHeight: '1.5' }],
  base: ['16px', { lineHeight: '1.5' }],
  lg: ['18px', { lineHeight: '1.5' }],
  xl: ['20px', { lineHeight: '1.4' }],
  '2xl': ['24px', { lineHeight: '1.35' }],
  '3xl': ['28px', { lineHeight: '1.3' }],
  '4xl': ['32px', { lineHeight: '1.25' }],
  '5xl': ['40px', { lineHeight: '1.2' }],
  '6xl': ['48px', { lineHeight: '1.15' }],
  '7xl': ['56px', { lineHeight: '1.1' }],
},
```

---

## CSS Classes

### Headings

| Class | Usage |
|-------|-------|
| `text-h1` | Page title |
| `text-h2` | Section title |
| `text-h3` | Card/section heading |
| `text-h4` | Subsection heading |
| `text-h5` | Small heading |
| `text-h6` | Smallest heading |

### Price (dominant styling)

| Class | Usage |
|-------|-------|
| `text-price-dominant` | Hero/product detail price |
| `text-price-lg` | Prominent price |
| `text-price` | Card/list price |
| `text-price-sm` | Secondary price |

### Body

| Class | Usage |
|-------|-------|
| `text-body-lg` | Large body copy |
| `text-body` | Default body text |
| `text-body-sm` | Small body, descriptions |

### Meta (muted)

| Class | Usage |
|-------|-------|
| `text-meta` | Timestamps, labels, secondary info |
| `text-meta-sm` | Smaller meta text |

### Buttons

| Class | Usage |
|-------|-------|
| `text-btn` | Button label (uppercase) |
| `text-btn-lg` | Large button label |

### Caption

| Class | Usage |
|-------|-------|
| `text-caption` | Overline, category labels |

---

## Usage Examples

```tsx
{/* Product price - dominant */}
<span className="text-price-dominant text-green-600">₹45,000</span>

{/* Card title */}
<h3 className="text-h4">iPhone 15 Pro Max</h3>

{/* Body copy */}
<p className="text-body">Description of the product goes here...</p>

{/* Meta: posted date */}
<span className="text-meta">Posted 2 hours ago</span>

{/* Button */}
<button className="bg-green-600 text-white px-4 py-3 rounded-xl text-btn">
  Contact Seller
</button>

{/* Section label */}
<span className="text-caption">Seller Information</span>
```

---

## Hierarchy Summary

1. **Dominant:** Price (hero, product detail)
2. **Primary:** H1–H3 (titles, section headers)
3. **Secondary:** H4–H6 (subheadings)
4. **Body:** Readable paragraph text (14–18px)
5. **Meta:** Muted timestamps, labels (10–12px)
6. **Action:** Uppercase button labels (12–14px)
