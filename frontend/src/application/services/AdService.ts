import api from '@/lib/api';
import { Ad, AdFilters, AdCreateData } from '@/domain/entities/Ad';

/**
 * Ad Service
 * Business logic for Ad operations
 */
export class AdService {
  async getAds(filters: AdFilters = {}): Promise<{
    ads: Ad[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const response = await api.get('/ads', { params: filters });
    return {
      ads: response.data.ads || [],
      pagination: response.data.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      }
    };
  }

  async getAdById(id: string): Promise<Ad> {
    const response = await api.get(`/ads/${id}`);
    return response.data.ad;
  }

  async createAd(adData: AdCreateData): Promise<Ad> {
    const formData = new FormData();
    
    // Append text fields
    Object.keys(adData).forEach(key => {
      if (key !== 'images' && adData[key as keyof AdCreateData] !== undefined) {
        const value = adData[key as keyof AdCreateData];
        if (value !== null && value !== undefined) {
          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      }
    });

    // Append images
    if (adData.images && adData.images.length > 0) {
      adData.images.forEach((image, index) => {
        // If image is a File object, append it
        // If it's a URL string, it should already be uploaded
        if (image instanceof File) {
          formData.append('images', image);
        }
      });
    }

    const response = await api.post('/ads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.ad;
  }

  async updateAd(id: string, adData: Partial<AdCreateData>): Promise<Ad> {
    const formData = new FormData();
    
    Object.keys(adData).forEach(key => {
      if (key !== 'images' && adData[key as keyof AdCreateData] !== undefined) {
        const value = adData[key as keyof AdCreateData];
        if (value !== null && value !== undefined) {
          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      }
    });

    if (adData.images) {
      adData.images.forEach((image) => {
        if (image instanceof File) {
          formData.append('images', image);
        }
      });
    }

    const response = await api.put(`/ads/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.ad;
  }

  async deleteAd(id: string): Promise<void> {
    await api.delete(`/ads/${id}`);
  }

  async toggleFavorite(adId: string): Promise<boolean> {
    const response = await api.post(`/ads/${adId}/favorite`);
    return response.data.isFavorite;
  }

  async checkFavorite(adId: string): Promise<boolean> {
    const response = await api.get(`/ads/${adId}/favorite`);
    return response.data.isFavorite || false;
  }

  async checkLimit(): Promise<{
    freeAdsUsed: number;
    limit: number;
    canPost: boolean;
  }> {
    const response = await api.get('/ads/check-limit');
    return response.data;
  }
}

export const adService = new AdService();
