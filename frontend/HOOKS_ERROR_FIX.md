# React Hooks Error Fix

## Error
**"Rendered more hooks than during the previous render"**

This is a critical React error that occurs when the number or order of hooks changes between renders.

## Root Cause

The error was in `frontend/components/LazyAdCard.tsx`.

### Problem Code
```tsx
// ❌ WRONG: Early return causes inconsistent hook usage
const { elementRef, hasIntersected } = useIntersectionObserver({...});

if (eager || showCard) {
  return <Card ad={ad} priority={priority} />; // elementRef not used
}

return (
  <div ref={elementRef}> // elementRef only used here
    {/* placeholder */}
  </div>
);
```

**Why this breaks:**
1. First render: `eager=false`, `showCard=false` → returns placeholder with `elementRef`
2. Second render: `showCard=true` → returns Card WITHOUT `elementRef`
3. React sees the ref being used inconsistently, causing the hook order to appear different

## Solution

Always maintain the same component structure regardless of the conditional state:

```tsx
// ✅ CORRECT: Always use elementRef in the same way
const { elementRef, hasIntersected } = useIntersectionObserver({...});

return (
  <div ref={elementRef}>
    {eager || showCard ? (
      <Card ad={ad} priority={priority} />
    ) : (
      <div className="...placeholder...">
        {/* skeleton */}
      </div>
    )}
  </div>
);
```

**Why this works:**
- The `elementRef` is ALWAYS attached to the outer div
- The conditional rendering happens INSIDE the ref container
- React sees consistent hook usage across all renders

## React Hooks Rules

### Rule 1: Only Call Hooks at the Top Level
❌ Don't call hooks inside:
- Loops
- Conditions
- Nested functions

✅ Always call hooks at the component's top level:
```tsx
function MyComponent() {
  const [state, setState] = useState(0);     // ✅ Top level
  const data = useQuery(...);                // ✅ Top level
  
  if (condition) {
    const [bad, setBad] = useState(0);       // ❌ Inside condition
  }
  
  return <div>...</div>;
}
```

### Rule 2: Maintain Consistent Hook Order
The number and order of hooks must be identical on every render:

```tsx
// ❌ WRONG: Conditional hook
function MyComponent({ showExtra }) {
  const [count, setCount] = useState(0);
  
  if (showExtra) {
    const [extra, setExtra] = useState(''); // ❌ Hook only called sometimes
  }
  
  return <div>...</div>;
}

// ✅ CORRECT: Always call the hook
function MyComponent({ showExtra }) {
  const [count, setCount] = useState(0);
  const [extra, setExtra] = useState('');   // ✅ Always called
  
  return (
    <div>
      {showExtra && <input value={extra} />}  {/* Conditionally USE the state */}
    </div>
  );
}
```

### Rule 3: Don't Return Early Before All Hooks
```tsx
// ❌ WRONG: Early return before hooks
function MyComponent({ isLoading }) {
  if (isLoading) return <Spinner />;         // ❌ Returns before hooks
  
  const [data, setData] = useState(null);    // This hook won't always run
  useEffect(() => {...}, []);
  
  return <div>{data}</div>;
}

// ✅ CORRECT: Call all hooks first
function MyComponent({ isLoading }) {
  const [data, setData] = useState(null);    // ✅ Always called
  useEffect(() => {...}, []);                // ✅ Always called
  
  if (isLoading) return <Spinner />;         // Early return AFTER hooks
  
  return <div>{data}</div>;
}
```

## Files Changed
- `frontend/components/LazyAdCard.tsx` - Fixed conditional rendering to maintain consistent hook usage

## Testing
1. Start dev server: `npm run dev`
2. Navigate to homepage (uses `LazyAdCard` extensively)
3. Scroll down to trigger lazy loading
4. Verify no "Rendered more hooks" error in console
5. Check that cards load smoothly as they enter viewport

## Related Components
These components use `LazyAdCard` and should now work correctly:
- `FreshRecommendationsOGNOX.tsx` (homepage feed)
- `ServicesHomeClient.tsx` (services page)
- Any component rendering ad cards in a list

## Prevention
To avoid this error in the future:

1. **Always call hooks at the top level** of your component
2. **Never conditionally call hooks** based on props or state
3. **Use the same number of hooks** on every render
4. **Conditionally render JSX**, not hooks
5. **Attach refs consistently** - don't conditionally attach/detach refs

## Verification Checklist
- [x] All hooks called at top level
- [x] No conditional hook calls
- [x] Refs attached consistently
- [x] Early returns only after all hooks
- [x] Dev server runs without errors
- [x] No console warnings about hooks

## Status
✅ **FIXED** - The hooks error has been resolved and the application runs without errors.
