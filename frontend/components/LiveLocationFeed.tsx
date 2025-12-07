'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGeolocation } from '@/hooks/useGeolocation';
import api from '@/lib/api';
import AdCard from './AdCard';
import { FiMapPin, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { getSocket } from '@/lib/socket';

interface LiveLocationFeedProps {
  radius?: number; // Radius in kilometers
  limit?: number;
}

export default function LiveLocationFeed({ radius = 50, limit = 20 }: LiveLocationFeedProps) {
  const { latitude, longitude, error: geoError, loading: geoLoading } = useGeolocation();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ads', 'location-feed', latitude, longitude, radius],
    queryFn: async () => {
      if (!latitude || !longitude) {
        throw new Error('Location not available');
      }
      const response = await api.get('/ads', {
        params: {
          latitude,
          longitude,
          radius,
          limit,
          sort: 'newest'
        }
      });
      return response.data;
    },
    enabled: !!latitude && !!longitude,
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds if auto-refresh is enabled
    refetchOnWindowFocus: true,
  });

  // Listen for new ads via Socket.IO
  useEffect(() => {
    if (!latitude || !longitude) return;

    const socket = getSocket();
    if (!socket) return;

    const handleNewAd = (ad: any) => {
      // Only show ads within radius
      if (ad.location?.latitude && ad.location?.longitude) {
        const distance = calculateDistance(
          latitude!,
          longitude!,
          ad.location.latitude,
          ad.location.longitude
        );
        if (distance <= radius) {
          // Invalidate query to refresh feed
          refetch();
          setLastUpdate(new Date());
        }
      }
    };

    socket.on('new_ad', handleNewAd);
    socket.on('ad_approved', handleNewAd);

    return () => {
      socket.off('new_ad', handleNewAd);
      socket.off('ad_approved', handleNewAd);
    };
  }, [latitude, longitude, radius, refetch]);

  // Update last update time when data changes
  useEffect(() => {
    if (data) {
      setLastUpdate(new Date());
    }
  }, [data]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  if (geoLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Getting your location...</p>
          </div>
        </div>
      </div>
    );
  }

  if (geoError) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Location Access Required</h3>
          <p className="text-gray-600 mb-4">{geoError}</p>
          <p className="text-sm text-gray-500">
            Please enable location access in your browser settings to see nearby ads.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-12">
          <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Feed</h3>
          <p className="text-gray-600 mb-4">{error?.message || 'Failed to load location-based ads'}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const ads = data?.ads || [];
  const adsWithDistance = ads.filter((ad: any) => ad.distance !== null && ad.distance !== undefined);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-3 rounded-xl shadow-md">
            <FiMapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Live Location Feed</h2>
              {autoRefresh && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Live
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              Ads within {radius}km of your location
              {lastUpdate && (
                <span className="ml-2 text-xs text-gray-500">
                  • Updated {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {autoRefresh ? '🟢 Live' : '⚪ Paused'}
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Ads Grid */}
      {adsWithDistance.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiMapPin className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Ads Nearby</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            There are no ads within {radius}km of your location. Try increasing the radius or check back later.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adsWithDistance.map((ad: any, index: number) => (
              <div 
                key={ad.id} 
                className="relative transform transition-all duration-300 hover:-translate-y-2"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <AdCard ad={ad} />
                {ad.distance !== null && (
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-1.5 z-20 backdrop-blur-sm">
                    <FiMapPin className="w-3.5 h-3.5" />
                    {ad.distance < 1
                      ? `${Math.round(ad.distance * 1000)}m`
                      : `${ad.distance.toFixed(1)}km`}
                  </div>
                )}
              </div>
            ))}
          </div>
          {data?.pagination && (
            <div className="mt-6 text-center text-sm text-gray-600">
              Showing {adsWithDistance.length} of {data.pagination.total} ads
            </div>
          )}
        </>
      )}
    </div>
  );
}

