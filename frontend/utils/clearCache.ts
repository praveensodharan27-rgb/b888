import api from '@/lib/api';

// Clear browser-side caches and optionally backend cache
export async function clearAllCache(clearBackend = false): Promise<void> {
  // Clear local/session storage
  if (typeof window !== 'undefined') {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }

    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error);
    }

    // Clear Cache Storage (if supported)
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (error) {
        console.warn('Failed to clear Cache Storage:', error);
      }
    }

    // Clear IndexedDB (best-effort)
    if (typeof indexedDB !== 'undefined' && 'databases' in indexedDB) {
      try {
        const databases = await (indexedDB as any).databases();
        if (Array.isArray(databases)) {
          await Promise.all(
            databases
              .filter((db: { name?: string }) => db.name)
              .map((db: { name?: string }) => indexedDB.deleteDatabase(db.name as string))
          );
        }
      } catch (error) {
        console.warn('Failed to clear IndexedDB:', error);
      }
    }
  }

  // Clear backend cache if requested
  if (clearBackend) {
    try {
      await api.post('/admin/cache/clear');
    } catch (error) {
      console.warn('Failed to clear backend cache:', error);
    }
  }
}
