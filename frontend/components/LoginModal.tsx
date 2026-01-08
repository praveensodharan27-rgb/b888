'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { FiX, FiMail, FiLock, FiEye, FiEyeOff, FiLogIn } from 'react-icons/fi';
import Link from 'next/link';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup?: () => void;
}

// Array of dark green/nature background images (free from Pexels/Unsplash)
const BACKGROUND_IMAGES = [
  'https://images.pexels.com/photos/1072824/pexels-photo-1072824.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/1440476/pexels-photo-1440476.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/167698/pexels-photo-167698.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/1179229/pexels-photo-1179229.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.pexels.com/photos/1323712/pexels-photo-1323712.jpeg?auto=compress&cs=tinysrgb&w=1920',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1920&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=1920&auto=format&fit=crop',
];

export default function LoginModal({ isOpen, onClose, onSwitchToSignup }: LoginModalProps) {
  const { login, sendOTP, verifyOTP } = useAuth();
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const { register, handleSubmit, formState: { errors }, reset, setError } = useForm();

  // Change background image every time modal opens
  useEffect(() => {
    if (isOpen) {
      // Randomly select a new image each time modal opens
      const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
      setBackgroundImage(BACKGROUND_IMAGES[randomIndex]);
    }
  }, [isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setMode('password');
      setOtpSent(false);
      setShowPassword(false);
      setIsSubmitting(false);
    }
  }, [isOpen, reset]);

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const onSubmitPassword = async (data: any) => {
    try {
      setIsSubmitting(true);
      
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
      
      // Validate that we have either email or phone
      if (!credentials.email && !credentials.phone) {
        setError('email', {
          type: 'manual',
          message: 'Please enter an email or phone number'
        });
        setIsSubmitting(false);
        return;
      }
      
      login(credentials, {
        onSuccess: () => {
          setIsSubmitting(false);
          onClose(); // Close modal on successful login
        },
        onError: (error: any) => {
          setIsSubmitting(false);
          // Error is already handled by useAuth hook with toast
          // But we can also set form-level errors if needed
          const errorMessage = error?.response?.data?.message || error?.message || 'Login failed. Please check your credentials.';
          setError('email', {
            type: 'manual',
            message: errorMessage
          });
        }
      });
    } catch (error: any) {
      setIsSubmitting(false);
      setError('email', {
        type: 'manual',
        message: 'An unexpected error occurred. Please try again.'
      });
    }
  };

  const onSubmitOTP = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      if (!otpSent) {
        const input = data.email?.trim() || '';
        const isEmail = input.includes('@');
        
        const otpData: { email?: string; phone?: string } = {};
        if (isEmail) {
          otpData.email = input;
        } else if (input) {
          otpData.phone = input;
        }
        
        if (!otpData.email && !otpData.phone) {
          setError('email', {
            type: 'manual',
            message: 'Please enter an email or phone number'
          });
          setIsSubmitting(false);
          return;
        }
        
        sendOTP(otpData, {
          onSuccess: () => {
            setOtpSent(true);
            setIsSubmitting(false);
          },
          onError: (error: any) => {
            setIsSubmitting(false);
            const errorMessage = error?.response?.data?.message || 'Failed to send OTP';
            setError('email', {
              type: 'manual',
              message: errorMessage
            });
          }
        });
      } else {
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
            setIsSubmitting(false);
            onClose(); // Close modal on successful OTP verification
          },
          onError: (error: any) => {
            setIsSubmitting(false);
            const errorMessage = error?.response?.data?.message || 'Invalid OTP';
            setError('code', {
              type: 'manual',
              message: errorMessage
            });
          }
        });
      }
    } catch (error: any) {
      setIsSubmitting(false);
      setError('email', {
        type: 'manual',
        message: 'An unexpected error occurred. Please try again.'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl transform transition-all my-8 relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-200 hover:bg-white/10 rounded-full transition-colors z-20 lg:text-gray-400 lg:hover:text-gray-600 lg:hover:bg-gray-100"
          >
            <FiX className="w-5 h-5" />
          </button>

          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Left Side - Image Background */}
            <div 
              className="hidden lg:block lg:w-1/2 bg-cover bg-center relative bg-gradient-to-br from-green-900 via-green-800 to-green-900"
              style={{
                backgroundImage: backgroundImage 
                  ? `url('${backgroundImage}'), linear-gradient(to bottom right, rgb(20, 83, 45), rgb(22, 101, 52), rgb(20, 83, 45))`
                  : 'linear-gradient(to bottom right, rgb(20, 83, 45), rgb(22, 101, 52), rgb(20, 83, 45))',
                transition: 'background-image 0.5s ease-in-out',
              }}
            >
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-900/90 via-green-800/85 to-green-900/90"></div>
              
              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-between p-12 text-white">
                {/* Logo and Tagline */}
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-white">
                    SellIt
                  </span>
                  <p className="text-green-200 text-lg">Buy & Sell Anything Today</p>
                </div>

                {/* Center Message */}
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <span className="text-4xl font-bold text-white mb-4">
                      SellIt
                    </span>
                  </div>
                  <h2 className="text-3xl font-bold mb-4">Welcome Back!</h2>
                  <p className="text-green-100 text-lg">
                    Access your account and continue shopping
                  </p>
                  <div className="mt-8 flex justify-center gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold">1000+</div>
                      <div className="text-sm text-green-200">Active Listings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">500+</div>
                      <div className="text-sm text-green-200">Happy Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">50+</div>
                      <div className="text-sm text-green-200">Categories</div>
                    </div>
                  </div>
                </div>

                {/* App Store Badges */}
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-black/70 transition-colors">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    <div className="text-left">
                      <div className="text-xs">Download on the</div>
                      <div className="text-sm font-semibold">App Store</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-black/70 transition-colors">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                    <div className="text-left">
                      <div className="text-xs">GET IT ON</div>
                      <div className="text-sm font-semibold">Google Play</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 p-8 lg:p-12 flex items-center justify-center bg-white">
              <div className="w-full max-w-md">
            {/* Title */}
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Log in
            </h2>
            <p className="text-gray-600 mb-8">
              Welcome back! login with your data that you entered during registration
            </p>

            {mode === 'password' ? (
              <>
                {/* Login Form */}
                <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-5">
                  {/* Email Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiMail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('email', { 
                          required: 'Email or phone is required',
                          validate: (value) => {
                            if (!value) return 'Email or phone is required';
                            const isEmail = value.includes('@');
                            const isPhone = /^[0-9+\-\s()]+$/.test(value.replace(/\s/g, ''));
                            if (!isEmail && !isPhone) {
                              return 'Please enter a valid email or phone number';
                            }
                            return true;
                          }
                        })}
                        type="text"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                        placeholder="Email"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message as string}</p>
                    )}
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('password', { required: 'Password is required' })}
                        type={showPassword ? 'text' : 'password'}
                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                        placeholder="Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <FiEyeOff className="h-5 w-5" />
                        ) : (
                          <FiEye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-sm mt-1">{errors.password.message as string}</p>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Remember me</span>
                    </label>
                    <Link 
                      href="/forgot-password" 
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      onClick={onClose}
                    >
                      Forgot your password?
                    </Link>
                  </div>

                  {/* LOGIN Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Logging in...
                      </span>
                    ) : (
                      'LOGIN'
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">Or sign in with</span>
                  </div>
                </div>

                {/* Social Login Buttons */}
                <div className="space-y-3">
                  <a
                    href={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}/api/auth/google`}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="font-medium text-gray-700">Login with Google</span>
                  </a>
                  <a
                    href={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}/api/auth/facebook`}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all"
                  >
                    <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="font-medium text-gray-700">Login with Facebook</span>
                  </a>
                </div>

                {/* Switch to OTP */}
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => setMode('otp')}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Login with OTP instead
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit(onSubmitOTP)} className="space-y-5">
                {!otpSent ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email or Phone</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiMail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('email', { required: true })}
                          type="text"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                          placeholder="Email or Phone"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        'Send OTP'
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Enter OTP Code</label>
                      <input
                        {...register('code', { required: 'OTP is required' })}
                        type="text"
                        maxLength={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center text-xl tracking-widest font-semibold text-gray-900"
                        placeholder="000000"
                      />
                      {errors.code && (
                        <p className="text-red-500 text-sm mt-1 text-center">{errors.code.message as string}</p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Verifying...
                        </span>
                      ) : (
                        'Verify OTP'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="w-full text-purple-600 hover:text-purple-700 font-medium text-sm"
                    >
                      Resend OTP
                    </button>
                  </>
                )}
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('password');
                      setOtpSent(false);
                    }}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    ← Back to password login
                  </button>
                </div>
              </form>
            )}

            {/* Sign Up Link */}
            <p className="text-center mt-8 text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSwitchToSignup) {
                    onSwitchToSignup();
                  }
                }}
                className="text-purple-600 hover:text-purple-700 font-semibold"
              >
                Register
              </button>
            </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

