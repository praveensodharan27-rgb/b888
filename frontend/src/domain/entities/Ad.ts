/**
 * Ad Domain Entity
 * Frontend representation of Ad
 */
export interface Ad {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  condition: 'NEW' | 'USED' | 'LIKE_NEW' | 'REFURBISHED';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  images: string[];
  attributes?: Record<string, any> | null;
  premiumType?: 'TOP' | 'FEATURED' | 'BUMP_UP' | null;
  isUrgent?: boolean;
  expiresAt?: string | null;
  premiumExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  categoryId: string;
  subcategoryId?: string | null;
  locationId?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  subcategory?: {
    id: string;
    name: string;
    slug: string;
  };
  location?: {
    id: string;
    name: string;
    slug: string;
  };
  user?: {
    id: string;
    name: string;
    avatar?: string;
    isVerified?: boolean;
  };
  _count?: {
    favorites?: number;
  };
}

export interface AdFilters {
  page?: number;
  limit?: number;
  category?: string;
  subcategory?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  condition?: 'NEW' | 'USED' | 'LIKE_NEW' | 'REFURBISHED';
  sort?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'featured' | 'bumped';
  latitude?: number;
  longitude?: number;
  radius?: number;
  userId?: string;
}

export interface AdCreateData {
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  condition?: 'NEW' | 'USED' | 'LIKE_NEW' | 'REFURBISHED';
  categoryId: string;
  subcategoryId?: string;
  locationId?: string;
  state?: string;
  city?: string;
  neighbourhood?: string;
  exactLocation?: string;
  images: string[];
  attributes?: Record<string, any>;
  premiumType?: 'TOP' | 'FEATURED' | 'BUMP_UP';
  isUrgent?: boolean;
  paymentOrderId?: string;
}
