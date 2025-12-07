/**
 * User Domain Entity
 * Frontend representation of User
 */
export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  showPhone?: boolean;
  role: 'USER' | 'ADMIN';
  isVerified: boolean;
  provider?: string | null;
  providerId?: string | null;
  createdAt?: string;
  followersCount?: number;
  followingCount?: number;
  locationId?: string | null;
  location?: {
    id: string;
    name: string;
    slug: string;
    city?: string;
    state?: string;
  } | null;
}

export interface UserProfile extends User {
  freeAdsUsed?: number;
  adsCount?: number;
}
