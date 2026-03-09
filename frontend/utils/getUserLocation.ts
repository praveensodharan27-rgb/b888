/**
 * Get User Location Utility
 * 
 * Features:
 * - Browser geolocation API
 * - Reverse geocoding (coordinates to city)
 * - Error handling
 * - Timeout protection
 */

export interface UserLocation {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
  accuracy?: number;
}

/**
 * Get user's current location using browser geolocation API
 * @param options - Geolocation options
 * @returns User location or null if unavailable
 */
export async function getUserLocation(options: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  reverseGeocode?: boolean;
} = {}): Promise<UserLocation | null> {
  const {
    enableHighAccuracy = false,
    timeout = 10000,
    maximumAge = 300000, // 5 minutes
    reverseGeocode = true,
  } = options;

  return new Promise((resolve) => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      resolve(null);
      return;
    }

    // Get current position
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        const location: UserLocation = {
          lat,
          lng,
          accuracy,
        };

        // Reverse geocode to get city name
        if (reverseGeocode) {
          try {
            const geocoded = await reverseGeocodeLocation(lat, lng);
            if (geocoded) {
              location.city = geocoded.city;
              location.state = geocoded.state;
              location.country = geocoded.country;
            }
          } catch (error) {
            console.error('Reverse geocoding failed:', error);
          }
        }

        resolve(location);
      },
      (error) => {
        console.error('Geolocation error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  });
}

/**
 * Reverse geocode coordinates to get city/state/country
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Location details
 */
export async function reverseGeocodeLocation(
  lat: number,
  lng: number
): Promise<{
  city?: string;
  state?: string;
  country?: string;
} | null> {
  try {
    // Use Nominatim (OpenStreetMap) for reverse geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          'User-Agent': 'SellIt-Marketplace/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    const data = await response.json();
    
    return {
      city: data.address?.city || data.address?.town || data.address?.village,
      state: data.address?.state,
      country: data.address?.country,
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates (in meters)
 * Uses Haversine formula
 * @param lat1 - Latitude 1
 * @param lng1 - Longitude 1
 * @param lat2 - Latitude 2
 * @param lng2 - Longitude 2
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 * @param meters - Distance in meters
 * @returns Formatted distance string
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  } else if (meters < 10000) {
    return `${(meters / 1000).toFixed(1)}km`;
  } else {
    return `${Math.round(meters / 1000)}km`;
  }
}

/**
 * Check if user has granted location permission
 * @returns Permission state
 */
export async function checkLocationPermission(): Promise<PermissionState | null> {
  if (!navigator.permissions) {
    return null;
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch (error) {
    console.error('Permission check failed:', error);
    return null;
  }
}

/**
 * Save user location to localStorage
 * @param location - User location
 */
export function saveUserLocation(location: UserLocation): void {
  try {
    localStorage.setItem('user_location', JSON.stringify(location));
    localStorage.setItem('user_location_timestamp', Date.now().toString());
  } catch (error) {
    console.error('Failed to save location:', error);
  }
}

/**
 * Get saved user location from localStorage
 * @param maxAge - Maximum age in milliseconds (default: 1 hour)
 * @returns Saved location or null
 */
export function getSavedUserLocation(maxAge: number = 3600000): UserLocation | null {
  try {
    const saved = localStorage.getItem('user_location');
    const timestamp = localStorage.getItem('user_location_timestamp');

    if (!saved || !timestamp) {
      return null;
    }

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > maxAge) {
      // Location is too old, remove it
      localStorage.removeItem('user_location');
      localStorage.removeItem('user_location_timestamp');
      return null;
    }

    return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to get saved location:', error);
    return null;
  }
}

/**
 * Get user location with caching
 * Tries to get from cache first, then fetches new if needed
 * @param options - Options
 * @returns User location
 */
export async function getUserLocationCached(options: {
  maxAge?: number;
  reverseGeocode?: boolean;
} = {}): Promise<UserLocation | null> {
  const { maxAge = 3600000, reverseGeocode = true } = options;

  // Try to get from cache first
  const cached = getSavedUserLocation(maxAge);
  if (cached) {
    return cached;
  }

  // Fetch new location
  const location = await getUserLocation({ reverseGeocode });
  if (location) {
    saveUserLocation(location);
  }

  return location;
}
