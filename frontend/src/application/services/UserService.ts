import api from '@/lib/api';
import { User, UserProfile } from '@/src/domain/entities/User';

/**
 * User Service
 * Business logic for User operations
 */
export class UserService {
  async getPublicProfile(userId: string): Promise<User> {
    const response = await api.get(`/user/public/${userId}`);
    return response.data.user;
  }

  async getProfile(): Promise<UserProfile> {
    const response = await api.get('/user/profile');
    return response.data.user;
  }

  async updateProfile(profileData: Partial<User>): Promise<UserProfile> {
    const response = await api.put('/user/profile', profileData);
    return response.data.user;
  }

  async updateAvatar(avatarFile: File): Promise<UserProfile> {
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    const response = await api.put('/user/avatar', formData);
    return response.data.user;
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put('/user/password', {
      currentPassword,
      newPassword
    });
  }

  async getUserAds(filters: {
    page?: number;
    limit?: number;
    status?: string;
  } = {}): Promise<{
    ads: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const response = await api.get('/user/ads', { params: filters });
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

  async getFreeAdsStatus(): Promise<{
    freeAdsUsed: number;
    limit: number;
    remaining: number;
    canPost: boolean;
  }> {
    const response = await api.get('/user/free-ads-status');
    return response.data;
  }

  async getSuggestedUsers(limit: number = 5): Promise<User[]> {
    // This could be moved to a separate service or endpoint
    const response = await api.get('/ads', {
      params: { limit }
    });
    
    if (response.data.success && response.data.ads) {
      const users = response.data.ads
        .map((ad: any) => ad.user)
        .filter((u: any) => u && u.id)
        .filter((u: any, index: number, self: any[]) => 
          self.findIndex(t => t.id === u.id) === index
        )
        .slice(0, limit);
      
      return users;
    }
    
    return [];
  }
}

export const userService = new UserService();
