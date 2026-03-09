'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useOTPTimer } from '@/hooks/useOTPTimer';
import { FiX, FiMail, FiLock, FiEye, FiEyeOff, FiLogIn } from 'react-icons/fi';
import Link from 'next/link';
import { getOrCreateSessionAuthQuote } from '@/lib/authQuotes';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup?: () => void;
  /** Called after successful login - used by auth modal to continue previous action */
  onLoginSuccess?: () => void;
}

// Array of marketplace/selling vector illustrations
// Add more images to /public/images/ folder and they will be randomly selected
const BACKGROUND_IMAGES = [
  '/images/login-ecommerce-illustration.png',
  '/images/liggraphy-olive-tree-3579922_1280.jpg',
  '/images/naster-forest-231066_1280.jpg',
  '/images/pexels-forest-1868885_1280.jpg',
  '/images/pexels-river-1866579_1280.jpg',
  '/images/pezibear-wolf-647528_1280.jpg',
];

export default function LoginModal({ isOpen, onClose, onSwitchToSignup, onLoginSuccess }: LoginModalProps) {
  const { login, sendOTP, verifyOTP } = useAuth();
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const otpTimer = useOTPTimer(60);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const { register, handleSubmit, formState: { errors }, reset, setError } = useForm();
  
  // Typing effect for quote
  const [displayQuote, setDisplayQuote] = useState('');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const QUOTE_TEXT = '"A green earth is a living earth."';

  // Change background image every time modal opens
  useEffect(() => {
    if (isOpen) {
      // Randomly select an image from the array
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
      otpTimer.reset();
      setDisplayQuote('');
      setQuoteIndex(0);
    }
  }, [isOpen, reset]);

  // Typing animation for quote
  useEffect(() => {
    if (!isOpen) {
      setDisplayQuote('');
      setQuoteIndex(0);
      return;
    }

    // Start typing animation after a short delay
    const startDelay = setTimeout(() => {
      if (quoteIndex < QUOTE_TEXT.length) {
        const typingTimer = setTimeout(() => {
          setDisplayQuote(QUOTE_TEXT.substring(0, quoteIndex + 1));
          setQuoteIndex(quoteIndex + 1);
        }, 80); // 80ms per character for faster typing

        return () => clearTimeout(typingTimer);
      }
    }, 300); // 300ms delay before starting

    return () => clearTimeout(startDelay);
  }, [isOpen, quoteIndex]);

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
        skipRedirect: !!onLoginSuccess,
        onSuccess: () => {
          setIsSubmitting(false);
          onLoginSuccess?.();
          onClose();
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
            otpTimer.start();
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
          skipRedirect: !!onLoginSuccess,
          onSuccess: () => {
            setIsSubmitting(false);
            onLoginSuccess?.();
            onClose();
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
      {/* Backdrop - dark overlay, close on click */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />
      
      {/* Modal - centered, scale and fade animation */}
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overflow-y-auto pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-8 relative overflow-hidden pointer-events-auto animate-fade-in-scale"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
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
            {/* Left Side - Image Background with Overlay Text Only (No Container/Card) */}
            <div 
              className="hidden lg:block lg:w-1/2 relative overflow-hidden"
              style={{
                backgroundColor: '#f3f4f6',
              }}
            >
              {/* Background Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: backgroundImage 
                    ? `url('${backgroundImage}')`
                    : 'linear-gradient(to bottom right, rgb(20, 83, 45), rgb(22, 101, 52), rgb(20, 83, 45))',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
              {/* Gradient overlay from bottom for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Top Logo */}
              <div className="absolute top-8 left-8 flex items-center gap-2 z-10">
                <span className="text-2xl">🌱</span>
                <span className="text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">Sell Box</span>
              </div>

              {/* Hero Text - Bottom Aligned */}
              <div className="absolute bottom-0 left-0 right-0 px-8 pb-8 z-10">
                <div className="max-w-xl">
                  {/* Main Heading */}
                  <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] animate-[fadeInUp_0.4s_ease-out]">
                    Join the Green Revolution
                  </h1>
                  
                  {/* Sub-heading with max width */}
                  <p className="text-white/95 text-lg leading-relaxed max-w-md mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] animate-[fadeInUp_0.5s_ease-out_0.1s_both]">
                    Connect with eco-conscious innovators and build a sustainable future together.
                  </p>
                  
                  {/* Quote with typing animation */}
                  <p className="text-white/90 text-base italic min-h-[1.5rem] drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
                    {displayQuote}
                    {quoteIndex < QUOTE_TEXT.length && (
                      <span className="inline-block w-[2px] h-5 bg-white/90 ml-[2px] typing-cursor" />
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 p-8 lg:p-12 flex items-center justify-center bg-white">
              <div className="w-full max-w-md">
            {/* Title */}
            <div className="mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-3">
                Welcome Back
              </h2>
              <p className="text-gray-600 text-base">
                Sign in to continue to your account
              </p>
            </div>

            {mode === 'password' ? (
              <>
                {/* Login Form */}
                <form onSubmit={handleSubmit(onSubmitPassword)} className="space-y-5">
                  {/* Email Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5">Email or Phone</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
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
                        className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-white hover:border-gray-300"
                        placeholder="Enter your email or phone number"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                        <span>⚠️</span>
                        {errors.email.message as string}
                      </p>
                    )}
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('password', { required: 'Password is required' })}
                        type={showPassword ? 'text' : 'password'}
                        className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-white hover:border-gray-300"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <FiEyeOff className="h-5 w-5" />
                        ) : (
                          <FiEye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                        <span>⚠️</span>
                        {errors.password.message as string}
                      </p>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                      <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900 transition-colors">Remember me</span>
                    </label>
                    <Link 
                      href="/forgot-password" 
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      onClick={onClose}
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {/* LOGIN Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-semibold text-base hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Logging in...</span>
                      </>
                    ) : (
                      <>
                        <FiLogIn className="w-5 h-5" />
                        <span>Sign In</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-gradient-to-br from-gray-50 to-white text-gray-500 font-medium">Or continue with</span>
                  </div>
                </div>

                {/* Social Login Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}/api/auth/google`}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow-md"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="font-medium text-gray-700 text-sm">Google</span>
                  </a>
                  <a
                    href={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}/api/auth/facebook`}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow-md"
                  >
                    <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="font-medium text-gray-700 text-sm">Facebook</span>
                  </a>
                </div>

                {/* Switch to OTP */}
                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() => setMode('otp')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2.5">Email or Phone</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FiMail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('email', { required: true })}
                          type="text"
                          className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-white hover:border-gray-300"
                          placeholder="Enter your email or phone number"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-semibold text-base hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <span>Send OTP</span>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2.5 text-center">Enter OTP Code</label>
                      <input
                        {...register('code', { required: 'OTP is required' })}
                        type="text"
                        maxLength={6}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest font-bold text-gray-900 bg-white hover:border-gray-300 transition-all"
                        placeholder="000000"
                      />
                      {errors.code && (
                        <p className="text-red-500 text-sm mt-2 text-center flex items-center justify-center gap-1">
                          <span>⚠️</span>
                          {errors.code.message as string}
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-semibold text-base hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Verify OTP</span>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={otpTimer.isActive}
                      onClick={() => setOtpSent(false)}
                      className="w-full text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {otpTimer.isActive ? `Resend OTP in ${otpTimer.formatted}` : 'Resend OTP'}
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
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    ← Back to password login
                  </button>
                </div>
              </form>
            )}

            {/* Sign Up Link */}
            <div className="text-center mt-8 pt-6 border-t border-gray-200">
              <p className="text-gray-600 text-sm">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onSwitchToSignup) {
                      onSwitchToSignup();
                    }
                  }}
                  className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                >
                  Create Account
                </button>
              </p>
            </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

