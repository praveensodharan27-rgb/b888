'use client';

import { useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import toast from '@/lib/toast';

export type LoginOptions = {
  onSuccess?: () => void;
  onError?: (error: any) => void;
  /** When true, do not redirect after login (e.g. when using auth modal to continue action) */
  skipRedirect?: boolean;
};

export interface User {
  id: string;
  name: string;
  username?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  showPhone?: boolean;
  showProfile?: boolean;
  showOnlineStatus?: boolean;
  showEmailOnListings?: boolean;
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

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = typeof window !== 'undefined' ? Cookies.get('token') : null;

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const response = await api.get('/auth/me');
        return response.data.user;
      } catch (error: any) {
        // Only treat 401 as actual logout - clear token and return null
        if (error.response?.status === 401) {
          Cookies.remove('token', { path: '/' });
          return null;
        }
        // Network error = backend unreachable; log once so user knows to start backend
        const isNetworkError =
          error.code === 'ERR_NETWORK' ||
          error.code === 'ECONNREFUSED' ||
          (error.message === 'Network Error' && !error.response);
        if (isNetworkError && typeof console !== 'undefined') {
          console.warn(
            '[Auth] Cannot reach API. Start backend (e.g. cd backend && npm run dev) and set NEXT_PUBLIC_API_URL in .env.local. See NETWORK_ERROR_TROUBLESHOOTING.md'
          );
        }
        // Rethrow so React Query keeps previous user data when backend is down
        throw error;
      }
    },
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const skipRedirectRef = useRef(false);

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email?: string; phone?: string; password: string }) => {
      try {
        const response = await api.post('/auth/login', credentials);
        if (!response.data || !response.data.success) {
          throw new Error(response.data?.message || 'Login failed');
        }
        return response.data;
      } catch (error: any) {
        if (error.response?.data?.message) {
          throw new Error(error.response.data.message);
        } else if (error.message) {
          throw error;
        } else if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
          throw new Error('Cannot connect to server. Please check your connection.');
        } else {
          throw new Error('Login failed. Please try again.');
        }
      }
    },
    onSuccess: (data) => {
      if (!data.token) {
        toast.error('Login failed: Invalid response from server');
        return;
      }
      Cookies.set('token', data.token, { expires: 7, path: '/', sameSite: 'lax', secure: typeof window !== 'undefined' && window.location?.protocol === 'https:' });
      queryClient.setQueryData(['auth', 'me'], data.user);
      toast.success('Logged in successfully');
      if (skipRedirectRef.current) {
        skipRedirectRef.current = false;
        return; // Stay on current page - caller will handle (e.g. auth modal)
      }
      if (data.user?.role === 'ADMIN') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || error.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string; password?: string; referralCode?: string }) => {
      // Strip empty strings - backend expects null/omit for optional fields
      const payload: Record<string, unknown> = {
        name: data.name?.trim() || '',
      };
      if (data.email?.trim()) payload.email = data.email.trim();
      if (data.phone?.trim()) payload.phone = data.phone.trim();
      if (data.password?.trim()) payload.password = data.password.trim();
      if (data.referralCode?.trim()) payload.referralCode = data.referralCode.trim();
      const response = await api.post('/auth/register', payload);
      return response.data;
    },
  });

  const sendOTPMutation = useMutation({
    mutationFn: async (data: { email?: string; phone?: string }) => {
      const response = await api.post('/auth/send-otp', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('OTP sent successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    },
  });

  const verifyOTPOptionsRef = useRef<{ skipRedirect?: boolean } | null>(null);

  const verifyOTPMutation = useMutation({
    mutationFn: async (data: { email?: string; phone?: string; code: string }) => {
      const response = await api.post('/auth/verify-otp', data);
      return response.data;
    },
    onSuccess: (data) => {
      Cookies.set('token', data.token, { expires: 7, path: '/', sameSite: 'lax', secure: typeof window !== 'undefined' && window.location?.protocol === 'https:' });
      queryClient.setQueryData(['auth', 'me'], data.user);
      toast.success('OTP verified successfully');
      if (verifyOTPOptionsRef.current?.skipRedirect) {
        verifyOTPOptionsRef.current = null;
        return;
      }
      if (data.user?.role === 'ADMIN') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'OTP verification failed');
    },
  });

  const logoutAllDevicesMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/user/logout-all-devices');
      return response.data;
    },
    onSuccess: () => {
      logout();
      toast.success('All devices have been logged out successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to logout all devices');
    },
  });

  const logout = () => {
    try {
      Cookies.remove('token', { path: '/' });
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.invalidateQueries();
      toast.success('Logged out successfully');
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath === '/') {
          window.location.reload();
        } else {
          window.location.href = '/';
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
      Cookies.remove('token', { path: '/' });
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath === '/') {
          window.location.reload();
        } else {
          window.location.href = '/';
        }
      }
    }
  };

  const setToken = (token: string) => {
    Cookies.set('token', token, { expires: 7, path: '/', sameSite: 'lax', secure: typeof window !== 'undefined' && window.location?.protocol === 'https:' });
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  };

  const updateUser = (updatedUser: Partial<User>) => {
    queryClient.setQueryData(['auth', 'me'], (old: User | null) => {
      if (!old) return null;
      return { ...old, ...updatedUser };
    });
  };

  const login = useCallback(
    (credentials: { email?: string; phone?: string; password: string }, options?: LoginOptions) => {
      if (options?.skipRedirect) skipRedirectRef.current = true;
      loginMutation.mutate(credentials, {
        onSuccess: options?.onSuccess,
        onError: options?.onError,
      });
    },
    [loginMutation]
  );

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    login,
    setToken,
    updateUser,
    register: (data: any, options?: { onSuccess?: (data: any) => void; onError?: (error: any) => void }) => {
      registerMutation.mutate(data, {
        onSuccess: (response) => {
          if (response?.token) {
            toast.success('Registration successful!');
            Cookies.set('token', response.token, { expires: 7, path: '/', sameSite: 'lax', secure: typeof window !== 'undefined' && window.location?.protocol === 'https:' });
            queryClient.setQueryData(['auth', 'me'], response.user);
          } else {
            toast.success('Registration successful. Please verify OTP.');
          }
          if (options?.onSuccess) {
            options.onSuccess(response);
          }
        },
        onError: (error: any) => {
          let errorMessage = 'Registration failed';
          if (error.response?.data) {
            const d = error.response.data;
            errorMessage = d.message || d.errors?.[0]?.msg || d.error || `Server error: ${error.response.status}`;
          } else if (error.request) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = error.message || 'An unexpected error occurred';
          }
          toast.error(errorMessage);
          if (options?.onError) {
            options.onError(error);
          }
        },
      });
    },
    sendOTP: sendOTPMutation.mutate,
    verifyOTP: (data: { email?: string; phone?: string; code: string }, options?: { onSuccess?: () => void; onError?: (e: any) => void; skipRedirect?: boolean }) => {
      if (options?.skipRedirect) verifyOTPOptionsRef.current = { skipRedirect: true };
      verifyOTPMutation.mutate(data, { onSuccess: options?.onSuccess, onError: options?.onError });
    },
    logout,
    logoutAllDevices: logoutAllDevicesMutation.mutate,
    isLoggingOutAllDevices: logoutAllDevicesMutation.isPending,
  };
}
