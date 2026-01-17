import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useEffect } from 'react';
import { disconnectSocket } from '@/lib/socket';

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

export const useAuth = () => {
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
        // Don't throw error on network issues or 401 - just return null
        // This prevents automatic redirects on page reload
        if (error.response?.status === 401) {
          // Clear invalid token silently
          Cookies.remove('token');
        }
        return null;
      }
    },
    retry: false,
    // Don't refetch on window focus to prevent redirect loops
    refetchOnWindowFocus: false,
    // Only fetch if we have a token
    enabled: !!token,
    // Add staleTime to prevent frequent refetches
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email?: string; phone?: string; password: string }) => {
      try {
        console.log('🔐 Attempting login with credentials:', {
          email: credentials.email ? `${credentials.email.substring(0, 3)}***` : undefined,
          phone: credentials.phone ? `${credentials.phone.substring(0, 3)}***` : undefined,
          hasPassword: !!credentials.password
        });
        
        const response = await api.post('/auth/login', credentials);
        
        if (!response.data || !response.data.success) {
          throw new Error(response.data?.message || 'Login failed');
        }
        
        return response.data;
      } catch (error: any) {
        console.error('❌ Login error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          code: error.code
        });
        
        // Re-throw with more context
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
        console.error('❌ No token in login response');
        toast.error('Login failed: Invalid response from server');
        return;
      }
      
      Cookies.set('token', data.token, { expires: 7 });
      queryClient.setQueryData(['auth', 'me'], data.user);
      toast.success('Logged in successfully');
      // Redirect admin to admin panel, regular users to home
      // Use replace instead of push to prevent back button from going to login page
      if (data.user?.role === 'ADMIN') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    },
    onError: (error: any) => {
      const errorMessage = error.message || error.response?.data?.message || 'Login failed. Please check your credentials.';
      console.error('❌ Login mutation error:', errorMessage);
      toast.error(errorMessage);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string; password?: string; referralCode?: string }) => {
      const response = await api.post('/auth/register', data);
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

  const verifyOTPMutation = useMutation({
    mutationFn: async (data: { email?: string; phone?: string; code: string }) => {
      const response = await api.post('/auth/verify-otp', data);
      return response.data;
    },
    onSuccess: (data) => {
      Cookies.set('token', data.token, { expires: 7 });
      queryClient.setQueryData(['auth', 'me'], data.user);
      toast.success('OTP verified successfully');
      // Use replace instead of push to prevent back button from going to login page
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
      // After logging out all devices, also logout current session
      logout();
      toast.success('All devices have been logged out successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to logout all devices');
    },
  });

  const logout = () => {
    try {
      // Remove token cookie
      Cookies.remove('token');
      
      // Disconnect Socket.IO if connected
      if (typeof window !== 'undefined') {
        disconnectSocket();
      }
      
      // Clear user data first
      queryClient.setQueryData(['auth', 'me'], null);
      
      // Invalidate all queries to ensure fresh state
      queryClient.invalidateQueries();
      
      // Clear all React Query cache
      queryClient.clear();
      
      // Show success message
      toast.success('Logged out successfully');
      
      // Check if user is on home page - if so, refresh it instead of redirecting to login
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath === '/') {
          // Refresh home page
          window.location.reload();
        } else {
          // Redirect to home page for other pages
          window.location.href = '/';
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, try to clear token and redirect
      Cookies.remove('token');
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
    Cookies.set('token', token, { expires: 7 });
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  };

  const updateUser = (updatedUser: Partial<User>) => {
    queryClient.setQueryData(['auth', 'me'], (old: User | null) => {
      if (!old) return null;
      return { ...old, ...updatedUser };
    });
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    login: loginMutation.mutate,
    setToken,
    updateUser,
    register: (data: any, options?: { onSuccess?: (data: any) => void; onError?: (error: any) => void }) => {
      registerMutation.mutate(data, {
        onSuccess: (response) => {
          console.log('Register mutation success, response:', response);
          
          // Handle auto-verification (dev mode with token)
          if (response?.token) {
            toast.success('Registration successful!');
            Cookies.set('token', response.token, { expires: 7 });
            queryClient.setQueryData(['auth', 'me'], response.user);
          } else {
            toast.success('Registration successful. Please verify OTP.');
          }
          
          // Call custom onSuccess callback with response
          if (options?.onSuccess) {
            console.log('Calling custom onSuccess with response:', response);
            options.onSuccess(response);
          }
        },
        onError: (error: any) => {
          // Better error handling with detailed messages
          let errorMessage = 'Registration failed';
          
          if (error.response) {
            errorMessage = error.response.data?.message || 
                          error.response.data?.errors?.[0]?.msg || 
                          `Server error: ${error.response.status}`;
          } else if (error.request) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = error.message || 'An unexpected error occurred';
          }
          
          toast.error(errorMessage);
          console.error('Registration error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            code: error.code,
            request: error.request ? 'Request sent but no response' : null
          });
          
          // Call custom onError callback
          if (options?.onError) {
            options.onError(error);
          }
        },
      });
    },
    sendOTP: sendOTPMutation.mutate,
    verifyOTP: verifyOTPMutation.mutate,
    logout,
    logoutAllDevices: logoutAllDevicesMutation.mutate,
    isLoggingOutAllDevices: logoutAllDevicesMutation.isPending,
  };
};

