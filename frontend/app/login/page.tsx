'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, sendOTP, verifyOTP, isLoading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const { register, handleSubmit, formState: { errors }, watch } = useForm();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if user is already logged in
  useEffect(() => {
    if (mounted && user && !authLoading) {
      if (user.role === 'ADMIN') {
        router.replace('/admin');
      } else {
        router.replace('/');
      }
    }
  }, [user, mounted, authLoading, router]);

  const email = watch('email');
  const phone = watch('phone');

  const onSubmitPassword = (data: any) => {
    // Determine if input is email or phone
    const input = data.email || data.phone || '';
    const isEmail = input.includes('@');
    
    const credentials: { email?: string; phone?: string; password: string } = {
      password: data.password
    };
    
    if (isEmail) {
      credentials.email = input;
    } else if (input) {
      credentials.phone = input;
    }
    
    login(credentials);
  };

  const onSubmitOTP = async (data: any) => {
    if (!otpSent) {
      // Determine if input is email or phone
      const input = data.email?.trim() || '';
      const isEmail = input.includes('@');
      
      const otpData: { email?: string; phone?: string } = {};
      if (isEmail) {
        otpData.email = input;
      } else if (input) {
        otpData.phone = input;
      }
      
      if (!otpData.email && !otpData.phone) {
        alert('Please enter an email or phone number');
        return;
      }
      
      sendOTP(otpData, {
        onSuccess: () => setOtpSent(true),
      });
    } else {
      // For verification, use the same logic
      const input = data.email?.trim() || '';
      const isEmail = input.includes('@');
      
      const otpData: { email?: string; phone?: string; code: string } = {
        code: data.code
      };
      if (isEmail) {
        otpData.email = input;
      } else if (input) {
        otpData.phone = input;
      }
      
      verifyOTP(otpData, {
        onSuccess: () => {
          // Redirect is handled in useAuth hook
        },
      });
    }
  };

  // Show loading during initial mount to prevent hydration mismatch
  // Also show loading if user is already logged in (redirecting)
  if (!mounted || authLoading || (user && !authLoading)) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setMode('password');
              setOtpSent(false);
            }}
            className={`flex-1 py-2 rounded-lg ${
              mode === 'password' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Password
          </button>
          <button
            onClick={() => {
              setMode('otp');
              setOtpSent(false);
            }}
            className={`flex-1 py-2 rounded-lg ${
              mode === 'otp' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            OTP
          </button>
        </div>

        {mode === 'password' ? (
          <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email or Phone *</label>
              <input
                {...register('email', { 
                  required: 'Email or phone is required',
                  validate: (value) => {
                    if (!value) return 'Email or phone is required';
                    // Check if it's a valid email or phone
                    const isEmail = value.includes('@');
                    const isPhone = /^[0-9+\-\s()]+$/.test(value.replace(/\s/g, ''));
                    if (!isEmail && !isPhone) {
                      return 'Please enter a valid email or phone number';
                    }
                    return true;
                  }
                })}
                type="text"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="admin@sellit.com or +1234567890"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message as string}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                {...register('password', { required: 'Password is required' })}
                type="password"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message as string}</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700"
              >
                Login
              </button>
            </div>
            <div className="text-right">
              <Link 
                href="/forgot-password" 
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit(onSubmitOTP)} className="space-y-4">
            {!otpSent ? (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Email or Phone</label>
                  <input
                    {...register('email', { required: !watch('phone') })}
                    type="text"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Email or Phone"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700"
                >
                  Send OTP
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">OTP Code</label>
                  <input
                    {...register('code', { required: 'OTP is required' })}
                    type="text"
                    maxLength={6}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-center text-2xl tracking-widest"
                    placeholder="000000"
                  />
                  {errors.code && (
                    <p className="text-red-500 text-sm mt-1">{errors.code.message as string}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700"
                >
                  Verify OTP
                </button>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-primary-600 hover:text-primary-700"
                >
                  Resend OTP
                </button>
              </>
            )}
          </form>
        )}

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <a
              href={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}/api/auth/google`}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </a>
            <a
              href={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}/api/auth/facebook`}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </a>
          </div>
        </div>

        <p className="text-center mt-6 text-gray-600">
          Don't have an account?{' '}
          <Link href="/register" className="text-primary-600 hover:text-primary-700">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

