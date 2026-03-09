# Website Performance & Smoothness Improvements

Summary of changes made to reduce UI lag, optimize API usage, and improve perceived performance across the marketplace.

## 1. Reduced UI Lag (React)

### Memoization
- **AdCard** – Wrapped with `React.memo`; `handleWishlist` and `handleCardClick` use `useCallback` to avoid re-renders from parent.
- **AdCardOLX** – Already used `memo` and `useCallback`; no change.
- **AdCardOGNOX** – Already optimized.
- **ImageWithFallback** – Wrapped with `React.memo` to avoid re-renders when parent updates.
- **SpecPills** – Wrapped with `React.memo` (small but frequent in lists).
- **LazyAdCard** – Wrapped with `React.memo` so list updates don’t re-render every card.

### Stable callbacks
- **useListingFilters** – `handleFilterChange`, `handleRemoveFilter`, `handleClearAllFilters` use `useCallback` with correct dependencies so filter UI and list components don’t re-render unnecessarily.
- **FilterPanel** – All filter handlers (`toggleCard`, `handleCategoryChange`, `handlePriceChange`, etc.) use `useCallback`.
- **SmartFiltersPanel** – `handleChange`, `clearFilter`, `clearAllFilters`, `toggleSection` use `useCallback`.
- **ListingPageLayout** – `handleSortChange` uses `useCallback`.
- **SearchResultsPage** – `handleFilterChange`, `handleRemoveFilter`, `handleSidebarFilterChange`, `handleClearFilters` use `useCallback`.

## 2. Optimized API Calls

### Stable query keys
- **useAds** – Query key now uses a serialized filter object (`getStableAdsFilterKey`) so the same filters don’t trigger a new request when the parent re-renders with a new object reference.
- **useHomeFeed** – Same idea: `getHomeFeedQueryKey(filters)` so the infinite-query key is stable and duplicate requests are avoided.
- **useAdsPaginated** – Already used `getStableFilterKey`; no change.

### Removed noisy logging
- **useHomeFeed** – Removed `console.log` in the fetch path and the `_t` cache-buster to avoid unnecessary request variation.

### Debounce
- **useDebouncedCallback** – New hook in `hooks/useDebouncedCallback.ts` for search/filter inputs. Use it for any rapid user input that triggers API calls (e.g. navbar search, filter fields).
- Existing debounce in **DynamicFilters** (300 ms) and **Hero** (250 ms) kept as-is.

## 3. Page Rendering & Lists

- **LazyAdCard** – Already defers rendering until the card is near the viewport (IntersectionObserver); kept and memoized.
- **HomeFeedGrid** – Infinite scroll observer uses `rootMargin: '200px'` and `threshold: 0` so the next page is requested before the user reaches the bottom.
- **ListingPageLayout** – Uses dynamic import for `SmartFiltersPanel` with a skeleton placeholder to avoid blocking the main content.
- **CategoryPageClient / SubcategoryPageClient** – Use dynamic import for Banners with a loading placeholder.

## 4. Image Optimization

- **ImageWithFallback** – Already uses Next.js `Image` with `sizes`, `loading="lazy"`, and `priority` for above-the-fold; no change.
- Ad cards pass `priority={index < 6}` (or similar) so only the first few cards load eagerly.

## 5. Smooth Scrolling & Interaction

- **globals.css** – `scroll-behavior: smooth` is already set on `html`.
- Card hover transitions (e.g. `transition-all duration-200`) are kept light so they don’t block the main thread.
- Filter and sort updates use `router.push(..., { scroll: false })` where appropriate so the page doesn’t jump on filter change.

## 6. Backend

- **Prisma schema** – Ad model already has indexes for `categoryId`, `subcategoryId`, `locationId`, `status`, `createdAt`, and composite indexes used by listing and home-feed queries; no schema changes.

## Usage Notes

- For new search or filter inputs that hit the API, use `useDebouncedCallback(fn, 250–300)` so typing doesn’t fire a request on every keystroke.
- When passing filter objects into `useAds`, `useHomeFeed`, or `useAdsPaginated`, you can pass new object references; the hooks derive a stable key internally.
- Keep list item components (cards, rows) wrapped in `memo` when they receive stable props (e.g. from a parent that uses `useCallback`/`useMemo`), so list re-renders don’t cascade to every item.
