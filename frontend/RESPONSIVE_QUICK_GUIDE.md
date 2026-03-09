# Responsive Design Quick Guide

## 🚀 Quick Start

### Use These Components

```tsx
import ResponsiveContainer from '@/components/layout/ResponsiveContainer';
import ResponsiveGrid from '@/components/layout/ResponsiveGrid';

// Standard page layout
<ResponsiveContainer>
  <ResponsiveGrid cols="cards">
    {items.map(item => <Card {...item} />)}
  </ResponsiveGrid>
</ResponsiveContainer>
```

---

## 📏 Spacing Cheat Sheet

### Padding
```tsx
px-4 sm:px-6 lg:px-8        // Horizontal
py-6 sm:py-8 lg:py-12       // Vertical
p-4 sm:p-5 lg:p-6           // All sides
```

### Margins
```tsx
mb-4 sm:mb-6 lg:mb-8        // Bottom
mt-6 sm:mt-8 lg:mt-10       // Top
mx-auto                      // Center
```

### Gaps
```tsx
gap-4 sm:gap-5 lg:gap-6     // Grid/Flex gap
space-y-4 sm:space-y-6      // Vertical stack
```

---

## 🎨 Typography

```tsx
// Headings
text-xl sm:text-2xl md:text-3xl lg:text-4xl

// Body
text-sm sm:text-base

// Small
text-xs sm:text-sm

// Display
text-3xl sm:text-4xl md:text-5xl lg:text-6xl
```

---

## 📐 Layouts

### Container
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {content}
</div>
```

### Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
  {items}
</div>
```

### Flex
```tsx
<div className="flex flex-col sm:flex-row gap-4">
  {items}
</div>
```

### Sidebar Layout
```tsx
<div className="flex flex-col lg:flex-row gap-6">
  <aside className="lg:w-[280px] flex-shrink-0">
    {sidebar}
  </aside>
  <main className="flex-1 min-w-0">
    {content}
  </main>
</div>
```

---

## 🖼️ Images

```tsx
import ImageWithFallback from '@/components/ImageWithFallback';

<ImageWithFallback
  src={imageUrl}
  alt={alt}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
/>
```

---

## 🔘 Buttons

```tsx
// Full width on mobile, auto on desktop
<button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3">
  {label}
</button>

// Always full width
<button className="w-full px-4 py-2">
  {label}
</button>

// Always auto width
<button className="px-4 py-2">
  {label}
</button>
```

---

## 📝 Forms

```tsx
// Single column on mobile, two columns on desktop
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <input className="w-full px-4 py-2" />
  <input className="w-full px-4 py-2" />
</div>

// Always full width
<input className="w-full px-4 py-2" />
```

---

## 📱 Mobile Menu

```tsx
// Hide on desktop, show on mobile
<div className="lg:hidden">
  {mobileMenu}
</div>

// Show on desktop, hide on mobile
<div className="hidden lg:block">
  {desktopMenu}
</div>
```

---

## 🎯 Common Patterns

### Text Truncation
```tsx
<div className="min-w-0">
  <p className="truncate">{text}</p>
</div>
```

### Line Clamp
```tsx
<p className="line-clamp-2">{text}</p>
```

### Aspect Ratio
```tsx
<div className="aspect-[4/3]">
  {content}
</div>
```

### Sticky Element
```tsx
<div className="sticky top-20">
  {content}
</div>
```

### Overflow Scroll
```tsx
<div className="overflow-x-auto">
  {content}
</div>
```

---

## ⚠️ Don'ts

### ❌ Never Use:
```tsx
w-[500px]           // Fixed width
ml-[300px]          // Fixed margin
h-[600px]           // Fixed height
max-w-[1400px]      // Use max-w-7xl instead
```

### ✅ Use Instead:
```tsx
w-full max-w-md     // Responsive width
ml-4 sm:ml-6        // Responsive margin
h-auto              // Auto height
max-w-7xl           // Tailwind size
```

---

## 🔍 Debugging

### Check for overflow:
```tsx
// Add to any container
className="overflow-x-hidden"
```

### Check min-width:
```tsx
// Add to flex children
className="min-w-0"
```

### Check text overflow:
```tsx
// Add to text elements
className="break-words"
```

---

## 📊 Breakpoints

```
sm:  640px   (Tablet)
md:  768px   (Tablet landscape)
lg:  1024px  (Laptop)
xl:  1280px  (Desktop)
2xl: 1536px  (Large desktop)
```

---

## 🎓 Best Practices

1. **Always start mobile-first**
2. **Use Tailwind spacing scale**
3. **Add `min-w-0` to flex children**
4. **Use `truncate` for long text**
5. **Use `aspect-ratio` for images**
6. **Use `max-w-*` not `w-[px]`**
7. **Test on real devices**
8. **Check horizontal scroll**

---

## 🚨 Quick Fixes

### Horizontal scroll?
```tsx
// Add to body/main container
className="overflow-x-hidden"
```

### Text overflowing?
```tsx
// Add to parent
className="min-w-0"

// Add to text
className="truncate"
```

### Image stretching?
```tsx
// Add to image
className="object-cover"
```

### Button too small on mobile?
```tsx
// Add minimum size
className="min-w-[44px] min-h-[44px]"
```

### Grid not responsive?
```tsx
// Use responsive columns
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
```

---

## 📚 Resources

- [Tailwind Docs](https://tailwindcss.com/docs)
- [Next.js Image Docs](https://nextjs.org/docs/api-reference/next/image)
- [Responsive Design Guide](./RESPONSIVE_LAYOUT_FIXES.md)
- [Audit Summary](./RESPONSIVE_AUDIT_SUMMARY.md)

---

**Remember**: Mobile first, always! 📱✨
