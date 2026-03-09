'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface PublicUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  isVerified: boolean;
  createdAt?: string;
  tags?: string[];
  _count?: {
    ads: number;
  };
}

interface ProfileCacheEntry {
  user: PublicUser;
  stats: {
    followers: number;
    following: number;
  };
  timestamp: number;
}

interface ProfileCacheContextType {
  getProfile: (userId: string) => ProfileCacheEntry | null;
  setProfile: (userId: string, data: ProfileCacheEntry) => void;
  updateFollowStats: (userId: string, isFollowing: boolean) => void;
  clearCache: () => void;
  isCached: (userId: string) => boolean;
}

const ProfileCacheContext = createContext<ProfileCacheContextType | undefined>(undefined);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function ProfileCacheProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<Map<string, ProfileCacheEntry>>(new Map());

  const isCached = useCallback((userId: string): boolean => {
    const entry = cache.get(userId);
    if (!entry) return false;
    
    const now = Date.now();
    const isExpired = now - entry.timestamp > CACHE_DURATION;
    
    if (isExpired) {
      setCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(userId);
        return newCache;
      });
      return false;
    }
    
    return true;
  }, [cache]);

  const getProfile = useCallback((userId: string): ProfileCacheEntry | null => {
    if (!isCached(userId)) return null;
    return cache.get(userId) || null;
  }, [cache, isCached]);

  const setProfile = useCallback((userId: string, data: ProfileCacheEntry) => {
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.set(userId, {
        ...data,
        timestamp: Date.now()
      });
      return newCache;
    });
  }, []);

  const updateFollowStats = useCallback((userId: string, isFollowing: boolean) => {
    setCache(prev => {
      const entry = prev.get(userId);
      if (!entry) return prev;

      const newCache = new Map(prev);
      newCache.set(userId, {
        ...entry,
        stats: {
          ...entry.stats,
          followers: isFollowing 
            ? entry.stats.followers + 1 
            : Math.max(0, entry.stats.followers - 1)
        }
      });
      return newCache;
    });
  }, []);

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  return (
    <ProfileCacheContext.Provider
      value={{
        getProfile,
        setProfile,
        updateFollowStats,
        clearCache,
        isCached
      }}
    >
      {children}
    </ProfileCacheContext.Provider>
  );
}

export function useProfileCache() {
  const context = useContext(ProfileCacheContext);
  if (context === undefined) {
    throw new Error('useProfileCache must be used within a ProfileCacheProvider');
  }
  return context;
}

