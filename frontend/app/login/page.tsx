'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useOTPTimer } from '@/hooks/useOTPTimer';
import { useForm } from 'react-hook-form';
import { FiEye, FiEyeOff, FiPhone, FiX } from 'react-icons/fi';
import { CONTENT_CONTAINER_CLASS } from '@/lib/layoutConstants';

const HEADLINE = 'Hello Sell Box Reseller! 👋';
const TAGLINE = 'Flip your finds, boost your profit. List once, resell fast, and let Sell Box handle the heavy lifting.';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, sendOTP, verifyOTP, isLoading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [callPopupOpen, setCallPopupOpen] = useState(false);
  const [headlineText, setHeadlineText] = useState('');
  const [taglineText, setTaglineText] = useState('');
  const otpTimer = useOTPTimer(60);
  const { register, handleSubmit, formState: { errors }, watch } = useForm();

  // Text animation: typewriter effect for headline
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i <= HEADLINE.length) {
        setHeadlineText(HEADLINE.slice(0, i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, []);

  // Typewriter effect for tagline (starts after small delay)
  useEffect(() => {
    let i = 0;
    const startDelay = 600;
    let startTimeout: NodeJS.Timeout | null = null;
    let typingTimer: NodeJS.Timeout | null = null;

    const startTyping = () => {
      typingTimer = setInterval(() => {
        if (i <= TAGLINE.length) {
          setTaglineText(TAGLINE.slice(0, i));
          i++;
        } else if (typingTimer) {
          clearInterval(typingTimer);
        }
      }, 35);
    };

    startTimeout = setTimeout(startTyping, startDelay);

    return () => {
      if (startTimeout) clearTimeout(startTimeout);
      if (typingTimer) clearInterval(typingTimer);
    };
  }, []);

  const currentYear = new Date().getFullYear();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show popup automatically once per session when login page loads
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const shown = sessionStorage.getItem('login-call-popup-shown');
    if (shown) return;
    const t = setTimeout(() => {
      setCallPopupOpen(true);
      sessionStorage.setItem('login-call-popup-shown', '1');
    }, 2000);
    return () => clearTimeout(t);
  }, [mounted]);

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
        onSuccess: () => {
          setOtpSent(true);
          otpTimer.start();
        },
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

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

  // Show loading during initial mount to prevent hydration mismatch
  if (!mounted || authLoading || (user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--navbar-height))] overflow-hidden flex items-center justify-center p-4 w-full bg-white">
      <div className={`w-full h-full max-h-full flex items-center ${CONTENT_CONTAINER_CLASS}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 w-full rounded-2xl overflow-hidden shadow-xl max-h-full overflow-auto">
      {/* Left: Marketing panel */}
      <div className="relative text-gray-900 p-8 lg:p-12 flex flex-col justify-between overflow-hidden bg-white border-r border-gray-200">
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-900">
            <span className="text-3xl">✦</span>
            <span className="text-xl font-semibold">Sell Box</span>
          </Link>
        </div>
        <div className="relative z-10 mt-12 lg:mt-0">
          <h2 className="text-3xl lg:text-4xl font-bold leading-tight max-w-md min-h-[3.5rem] md:min-h-[4.5rem] text-gray-900">
            {headlineText}
            <span className="inline-block w-0.5 h-[1em] ml-0.5 bg-primary-600 animate-pulse align-baseline" aria-hidden />
          </h2>
          <p className="mt-4 text-base lg:text-lg max-w-md leading-relaxed font-semibold">
            <span className="text-gray-800 mr-1">Welcome back.</span>
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-yellow-400 bg-clip-text text-transparent">
              {taglineText}
            </span>
          </p>
        </div>
        <p className="relative z-10 text-gray-500 text-sm mt-8">
          © {currentYear} Sell Box. All rights reserved.
        </p>
      </div>

      {/* Right: Login form - SaleSkip style */}
      <div className="bg-white flex flex-col justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm mx-auto">
          <Link href="/" className="inline-block text-xl font-bold text-gray-900 mb-6">Sell Box</Link>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Welcome Back!</h1>
          <p className="mt-2 text-gray-800 text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-primary-600 hover:text-primary-700 underline">
              Create a new account now
            </Link>
            , it&apos;s FREE! Takes less than a minute.
          </p>

          {mode === 'password' ? (
            <form onSubmit={handleSubmit(onSubmitPassword)} className="mt-8 space-y-5">
              <div>
                <input
                  {...register('email', {
                    required: 'Email or phone is required',
                    validate: (v) => {
                      if (!v) return 'Email or phone is required';
                      const isEmail = v.includes('@');
                      const isPhone = /^[0-9+\-\s()]+$/.test(v.replace(/\s/g, ''));
                      return isEmail || isPhone || 'Please enter a valid email or phone number';
                    },
                  })}
                  type="text"
                  className="input-global"
                  placeholder="Email or phone"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>
                )}
              </div>
              <div className="relative">
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  className="input-global pr-10"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>
                )}
              </div>
              <button
                type="submit"
                className="btn-primary-global"
              >
                Login Now
              </button>
              <a
                href={`${apiBase}/api/auth/google`}
                className="w-full inline-flex justify-center items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Login with Google
              </a>
              <p className="text-gray-500 text-sm">
                Forget password{' '}
                <Link href="/forgot-password" className="font-medium text-primary-600 hover:text-primary-700 underline">
                  Click here
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmitOTP)} className="mt-8 space-y-5">
              {!otpSent ? (
                <>
                  <input
                    {...register('email', { required: 'Email or phone is required' })}
                    type="text"
                    className="input-global"
                    placeholder="Email or phone"
                  />
                  <button
                    type="submit"
                    className="btn-primary-global"
                  >
                    Send OTP
                  </button>
                </>
              ) : (
                <>
                  <input
                    {...register('code', { required: 'OTP is required' })}
                    type="text"
                    maxLength={6}
                    className="input-global text-center text-xl tracking-[0.35em] font-semibold"
                    placeholder="000000"
                  />
                  {errors.code && (
                    <p className="text-red-500 text-xs mt-1">{errors.code.message as string}</p>
                  )}
                  <button
                    type="submit"
                    className="btn-primary-global"
                  >
                    Verify OTP
                  </button>
                  <button
                    type="button"
                    disabled={otpTimer.isActive}
                    onClick={() => {
                      const input = watch('email')?.trim() || '';
                      const isEmail = input.includes('@');
                      const payload = isEmail ? { email: input } : { phone: input };
                      sendOTP(payload, { onSuccess: () => otpTimer.start() });
                    }}
                    className="w-full text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                  >
                    {otpTimer.isActive ? `Resend OTP in ${otpTimer.formatted}` : 'Resend OTP'}
                  </button>
                </>
              )}
            </form>
          )}

          <div className="mt-10 pt-6 border-t border-gray-100 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <Link href="/contact" className="hover:text-gray-600">Help Center</Link>
            <Link href="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-600">Terms of Service</Link>
          </div>

          <p className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === 'password' ? 'otp' : 'password'); setOtpSent(false); }}
              className="text-xs text-gray-500 hover:text-primary-600"
            >
              {mode === 'password' ? 'Login with OTP instead' : 'Login with password instead'}
            </button>
          </p>
        </div>
      </div>
        </div>
      </div>

      {/* Floating call button - opens popup */}
      <button
        onClick={() => setCallPopupOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-300/50 hover:bg-primary-700 flex items-center justify-center transition-colors"
        aria-label="Call support"
      >
        <FiPhone className="h-6 w-6" />
      </button>

      {/* Call popup - z-index above navbar (100) */}
      {callPopupOpen && (
        <>
          <div
            className="fixed inset-0 z-[110] bg-black/40"
            onClick={() => setCallPopupOpen(false)}
            aria-hidden
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[111] w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Need help?</h3>
              <button
                onClick={() => setCallPopupOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-4">Call our support team for assistance with login or account issues.</p>
            <a
              href="tel:+911234567890"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
            >
              <FiPhone className="h-5 w-5" />
              +91 123 456 7890
            </a>
          </div>
        </>
      )}
    </div>
  );
}

