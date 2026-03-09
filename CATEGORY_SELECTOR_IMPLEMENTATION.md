# Category Selector Implementation Guide

## Overview

A complete, production-ready category selector implementation with:
- ✅ Custom `useCategories` hook using React Query
- ✅ Automatic caching (5 minutes)
- ✅ Loading skeleton
- ✅ Error handling with retry
- ✅ Empty state handling
- ✅ Subcategory disabled until category selected
- ✅ Debug information (development mode)
- ✅ TypeScript support
- ✅ Proper validation

## Files Created

### 1. `hooks/useCategories.ts`
Custom React Query hook for fetching and managing categories.

**Features:**
- Fetches categories from API
- Caches data for 5 minutes
- Filters main categories only
- Provides helper functions
- Handles errors gracefully

**Exports:**
```typescript
interface UseCategoriesReturn {
  categories: Category[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  mainCategories: Category[];
  getSubcategories: (categoryId: string) => Subcategory[];
  getCategoryById: (categoryId: string) => Category | undefined;
  getSubcategoryById: (categoryId: string, subcategoryId: string) => Subcategory | undefined;
}
```

### 2. `components/CategorySelector.tsx`
Reusable category selector component.

**Features:**
- Loading skeleton while fetching
- Error state with retry button
- Empty state handling
- Disabled subcategory until category selected
- Validation error display
- Debug info (dev mode only)

**Props:**
```typescript
interface CategorySelectorProps {
  selectedCategoryId: string;
  selectedSubcategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange: (subcategoryId: string) => void;
  categoryError?: string;
  subcategoryError?: string;
}
```

### 3. `components/CategorySelectorExample.tsx`
Example implementation with form validation.

## Usage

### Basic Usage

```tsx
import { useState } from 'react';
import CategorySelector from '@/components/CategorySelector';

export default function MyForm() {
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');

  return (
    <CategorySelector
      selectedCategoryId={categoryId}
      selectedSubcategoryId={subcategoryId}
      onCategoryChange={setCategoryId}
      onSubcategoryChange={setSubcategoryId}
    />
  );
}
```

### With Validation

```tsx
import { useState } from 'react';
import CategorySelector from '@/components/CategorySelector';
import { useCategories } from '@/hooks/useCategories';

export default function MyForm() {
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [errors, setErrors] = useState<{
    category?: string;
    subcategory?: string;
  }>({});

  const { getSubcategories } = useCategories();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: any = {};

    // Validate category
    if (!categoryId) {
      newErrors.category = 'Please select a category';
    }

    // Validate subcategory (if category has subcategories)
    const subcategories = getSubcategories(categoryId);
    if (categoryId && subcategories.length > 0 && !subcategoryId) {
      newErrors.subcategory = 'Please select a subcategory';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Submit form
    console.log('Submitted:', { categoryId, subcategoryId });
  };

  return (
    <form onSubmit={handleSubmit}>
      <CategorySelector
        selectedCategoryId={categoryId}
        selectedSubcategoryId={subcategoryId}
        onCategoryChange={(id) => {
          setCategoryId(id);
          setErrors(prev => ({ ...prev, category: undefined }));
        }}
        onSubcategoryChange={(id) => {
          setSubcategoryId(id);
          setErrors(prev => ({ ...prev, subcategory: undefined }));
        }}
        categoryError={errors.category}
        subcategoryError={errors.subcategory}
      />
      
      <button type="submit">Submit</button>
    </form>
  );
}
```

### With React Hook Form

```tsx
import { useForm } from 'react-hook-form';
import CategorySelector from '@/components/CategorySelector';
import { useCategories } from '@/hooks/useCategories';

interface FormData {
  categoryId: string;
  subcategoryId: string;
}

export default function MyForm() {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>();
  const { getSubcategories } = useCategories();

  const categoryId = watch('categoryId');
  const subcategoryId = watch('subcategoryId');

  const onSubmit = (data: FormData) => {
    console.log('Submitted:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <CategorySelector
        selectedCategoryId={categoryId || ''}
        selectedSubcategoryId={subcategoryId || ''}
        onCategoryChange={(id) => setValue('categoryId', id)}
        onSubcategoryChange={(id) => setValue('subcategoryId', id)}
        categoryError={errors.categoryId?.message}
        subcategoryError={errors.subcategoryId?.message}
      />
      
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Hook API

### `useCategories()`

Returns an object with the following properties:

#### `categories: Category[]`
Array of main categories (filtered, no subcategories in main list).

#### `isLoading: boolean`
True while fetching categories from API.

#### `isError: boolean`
True if API request failed.

#### `error: Error | null`
Error object if request failed.

#### `refetch: () => void`
Function to manually refetch categories.

#### `mainCategories: Category[]`
Same as `categories` (alias for clarity).

#### `getSubcategories(categoryId: string): Subcategory[]`
Get all subcategories for a specific category.

```tsx
const { getSubcategories } = useCategories();
const subs = getSubcategories('category-id-123');
```

#### `getCategoryById(categoryId: string): Category | undefined`
Get category object by ID.

```tsx
const { getCategoryById } = useCategories();
const category = getCategoryById('category-id-123');
console.log(category?.name); // "Mobiles"
```

#### `getSubcategoryById(categoryId: string, subcategoryId: string): Subcategory | undefined`
Get subcategory object by ID.

```tsx
const { getSubcategoryById } = useCategories();
const subcategory = getSubcategoryById('category-id', 'subcategory-id');
console.log(subcategory?.name); // "Mobile Phones"
```

## Component States

### 1. Loading State
Shows skeleton while fetching categories.

```
┌─────────────────────────────────────┐
│ 1. Category & Subcategory           │
├─────────────────────────────────────┤
│ ████████ (animated skeleton)        │
│ ████████████████████████            │
│                                     │
│ ████████                            │
│ ████████████████████████            │
└─────────────────────────────────────┘
```

### 2. Error State
Shows error message with retry button.

```
┌─────────────────────────────────────┐
│ 1. Category & Subcategory           │
├─────────────────────────────────────┤
│ ⚠️ Failed to Load Categories        │
│ Unable to fetch categories.         │
│ Please try again.                   │
│                                     │
│ [🔄 Retry]                          │
└─────────────────────────────────────┘
```

### 3. Empty State
Shows when no categories in database.

```
┌─────────────────────────────────────┐
│ 1. Category & Subcategory           │
├─────────────────────────────────────┤
│ ⚠️ No Categories Available          │
│ No categories found in the          │
│ database. Please contact support.   │
│                                     │
│ [🔄 Refresh]                        │
└─────────────────────────────────────┘
```

### 4. Success State (No Category Selected)
Shows category dropdown with info message.

```
┌─────────────────────────────────────┐
│ 1. Category & Subcategory           │
├─────────────────────────────────────┤
│ Main Category *                     │
│ [Select Main Category ▼]            │
│                                     │
│ 💡 Select a main category to see   │
│    available subcategories.         │
└─────────────────────────────────────┘
```

### 5. Success State (Category Selected, Has Subcategories)
Shows both dropdowns.

```
┌─────────────────────────────────────┐
│ 1. Category & Subcategory           │
├─────────────────────────────────────┤
│ Main Category *                     │
│ [Mobiles ▼]                         │
│                                     │
│ Subcategory *                       │
│ [Select Subcategory ▼]              │
└─────────────────────────────────────┘
```

### 6. Success State (Category Selected, No Subcategories)
Shows category dropdown with info message.

```
┌─────────────────────────────────────┐
│ 1. Category & Subcategory           │
├─────────────────────────────────────┤
│ Main Category *                     │
│ [Services ▼]                        │
│                                     │
│ ℹ️ This category has no             │
│    subcategories. You can proceed   │
│    with just the category.          │
└─────────────────────────────────────┘
```

## Features

### ✅ Automatic Caching
Categories are cached for 5 minutes using React Query. Subsequent renders use cached data.

### ✅ Loading Skeleton
Shows animated skeleton while fetching data (better UX than spinners).

### ✅ Error Handling
- Shows user-friendly error message
- Provides retry button
- Logs detailed errors to console (development)

### ✅ Empty State
Handles case when database has no categories.

### ✅ Disabled Subcategory
Subcategory dropdown is disabled until category is selected.

### ✅ Auto-clear Subcategory
When category changes, subcategory is automatically cleared.

### ✅ Validation Support
Accepts error props to show validation messages.

### ✅ Debug Mode
Shows debug information in development mode:
- Categories count
- Selected category name
- Subcategories count
- Loading/error states

### ✅ TypeScript
Full TypeScript support with proper types.

## Testing

### Test Loading State
```tsx
// Simulate slow API
import { useCategories } from '@/hooks/useCategories';

// In your test, the skeleton should show while isLoading is true
const { isLoading } = useCategories();
expect(isLoading).toBe(true);
```

### Test Error State
```tsx
// Simulate API error by stopping backend
// Component should show error message and retry button
```

### Test Empty State
```tsx
// Simulate empty database
// Component should show "No Categories Available" message
```

### Test Category Selection
```tsx
// Select a category
// Subcategory dropdown should appear (if category has subcategories)
// Subcategory should be enabled
```

### Test Subcategory Disabled
```tsx
// Without selecting category
// Subcategory dropdown should be disabled or hidden
```

## Integration with Existing Post Ad Page

To integrate with the existing post-ad page:

1. **Import the hook and component:**
```tsx
import { useCategories } from '@/hooks/useCategories';
import CategorySelector from '@/components/CategorySelector';
```

2. **Replace the existing category section** (lines 3749-3897) with:
```tsx
<CategorySelector
  selectedCategoryId={watch('categoryId') || ''}
  selectedSubcategoryId={watch('subcategoryId') || ''}
  onCategoryChange={(id) => {
    setValue('categoryId', id, { shouldValidate: true });
    setValue('subcategoryId', '', { shouldValidate: false });
    clearErrors('subcategoryId');
    trigger('categoryId');
  }}
  onSubcategoryChange={(id) => {
    setValue('subcategoryId', id, { shouldValidate: true });
    trigger('subcategoryId');
  }}
  categoryError={errors.categoryId?.message as string}
  subcategoryError={errors.subcategoryId?.message as string}
/>
```

3. **Remove the old useQuery for categories** (lines 280-500+) since `useCategories` hook handles it.

## Performance

- **Caching:** 5 minutes (configurable in hook)
- **Garbage Collection:** 10 minutes
- **Retry:** 2 attempts on failure
- **Timeout:** 15 seconds
- **Refetch on Focus:** Disabled (to avoid unnecessary requests)
- **Refetch on Mount:** Disabled (uses cache if available)

## Customization

### Change Cache Duration
Edit `hooks/useCategories.ts`:
```typescript
staleTime: 10 * 60 * 1000, // 10 minutes
gcTime: 20 * 60 * 1000, // 20 minutes
```

### Change Styling
Edit `components/CategorySelector.tsx` and modify Tailwind classes.

### Add More Helper Functions
Add to `hooks/useCategories.ts`:
```typescript
// Get all categories with subcategories
const getCategoriesWithSubcategories = (): Category[] => {
  return mainCategories.filter(cat => 
    cat.subcategories && cat.subcategories.length > 0
  );
};
```

## Troubleshooting

### Categories Not Loading
1. Check backend is running: `http://localhost:5000/api/categories`
2. Check browser console for errors
3. Check Network tab in DevTools
4. Verify API endpoint in `lib/api.ts`

### Subcategory Not Showing
1. Check if selected category has subcategories
2. Check console for category data
3. Verify `getSubcategories()` returns data

### Skeleton Not Showing
1. Check if `isLoading` is true
2. Verify React Query is configured
3. Check if cache has data (might skip loading)

### Error State Not Showing
1. Stop backend to trigger error
2. Check if `isError` is true
3. Verify error handling in hook

## Best Practices

1. **Always clear subcategory when category changes**
2. **Validate subcategory only if category has subcategories**
3. **Use helper functions instead of direct data access**
4. **Show loading skeleton, not spinners**
5. **Provide retry button on errors**
6. **Cache data to reduce API calls**
7. **Use TypeScript for type safety**

## Summary

This implementation provides a complete, production-ready category selector with:
- ✅ Custom hook with React Query
- ✅ Proper caching
- ✅ Loading skeleton
- ✅ Error handling
- ✅ Empty state
- ✅ Disabled subcategory
- ✅ Validation support
- ✅ TypeScript support
- ✅ Debug mode
- ✅ Reusable component

All requirements met! 🎉
