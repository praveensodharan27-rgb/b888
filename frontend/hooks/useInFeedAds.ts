'use client';

import { useMemo } from 'react';
import { Ad } from './useAds';

/**
 * Hook to insert ads into feed after every N items (OLX style)
 * 
 * @param items - Regular items (products/ads)
 * @param ads - Ads to insert (should be pre-filtered by location and ranked)
 * @param interval - Insert after every N items (default: 10)
 * @returns Combined feed with ads inserted
 */
export function useInFeedAds<T>(
  items: T[],
  ads: Ad[],
  interval: number = 10
): (T | Ad)[] {
  return useMemo(() => {
    if (!ads || ads.length === 0) return items as (T | Ad)[];
    if (!items || items.length === 0) return ads as (T | Ad)[];

    const result: (T | Ad)[] = [];
    let businessAdIndex = 0;
    let premiumAdIndex = 0;
    let freeAdIndex = 0;

    // Separate ads by type
    const businessAds = ads.filter(ad => {
      if (ad.isPremium === true) return false; // Premium takes priority
      return ad.packageType && ['SELLER_PRIME', 'SELLER_PLUS', 'MAX_VISIBILITY'].includes(ad.packageType);
    });
    
    const premiumAds = ads.filter(ad => ad.isPremium === true);
    
    const freeAds = ads.filter(ad => 
      !ad.isPremium && 
      (!ad.packageType || ad.packageType === 'NORMAL')
    );

    for (let i = 0; i < items.length; i++) {
      result.push(items[i]);

      // Insert ad block after every N items
      if ((i + 1) % interval === 0) {
        const adBlock: Ad[] = [];

        // Insert 1 Business ad
        if (businessAds.length > 0) {
          adBlock.push(businessAds[businessAdIndex % businessAds.length]);
          businessAdIndex++;
        }

        // Insert 1 Premium ad
        if (premiumAds.length > 0) {
          adBlock.push(premiumAds[premiumAdIndex % premiumAds.length]);
          premiumAdIndex++;
        }

        // Insert 1 Free ad (if available)
        if (freeAds.length > 0) {
          adBlock.push(freeAds[freeAdIndex % freeAds.length]);
          freeAdIndex++;
        }

        result.push(...adBlock);
      }
    }

    return result;
  }, [items, ads, interval]);
}
