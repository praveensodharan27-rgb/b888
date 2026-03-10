'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useOTPTimer } from '@/hooks/useOTPTimer';
import { useForm } from 'react-hook-form';
import toast from '@/lib/toast';
import { CONTENT_CONTAINER_CLASS } from '@/lib/layoutConstants';

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser, sendOTP, verifyOTP } = useAuth();
  const [step, setStep] = useState<'register' | 'otp'>('register');
  const [formData, setFormData] = useState<any>({});
  const [receiveUpdates, setReceiveUpdates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const otpTimer = useOTPTimer(60);
  const otpStepMountRef = useRef(false);
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm();

  useEffect(() => {
    if (step === 'otp' && !otpStepMountRef.current) {
      otpStepMountRef.current = true;
      otpTimer.start();
    }
    if (step === 'register') otpStepMountRef.current = false;
  }, [step]);

  // Get referral code from URL parameter and set it automatically (hidden field)
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setValue('referralCode', refCode.trim().toUpperCase());
      console.log('Referral code captured from URL:', refCode);
    }
  }, [searchParams, setValue]);

  const onSubmitRegister = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      if (!data.email && !data.phone) {
        toast.error('Please provide either email or phone number');
        setIsSubmitting(false);
        return;
      }
      
      const refCode = searchParams.get('ref');
      if (refCode && !data.referralCode) {
        data.referralCode = refCode.trim().toUpperCase();
      }
      
      setFormData(data);
      
      registerUser(data, {
        onSuccess: (response) => {
          setIsSubmitting(false);
          if (response?.referral?.success) {
            toast.success(
              `🎉 Referral applied! You'll get rewards when you complete registration!`,
              { duration: 5000 }
            );
          }
          
          if (response?.token) {
            router.push('/');
            return;
          }
          
          setStep('otp');
        },
        onError: (error: any) => {
          setIsSubmitting(false);
          console.error('Registration error:', error);
        },
      });
    } catch (error) {
      setIsSubmitting(false);
      toast.error('An error occurred. Please try again.');
    }
  };

  const onSubmitOTP = (data: any) => {
    verifyOTP({ email: formData.email, phone: formData.phone, code: data.code }, {
      onSuccess: () => router.push('/'),
    });
  };

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://148.230.67.118:5000/api').replace(/\/api$/, '');

  return (
    <div className="h-[calc(100vh-var(--navbar-height))] overflow-hidden flex items-center justify-center p-4 w-full bg-gray-50">
      <div className={`w-full h-full max-h-full flex items-center ${CONTENT_CONTAINER_CLASS}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 w-full rounded-2xl overflow-hidden bg-white shadow-xl max-h-full overflow-auto">
      {/* Left Side - Sign Up Form */}
      <div className="w-full flex items-center justify-center p-8 lg:p-10 bg-white">
        <div className="w-full max-w-md">
          {step === 'register' ? (
            <>
              {/* Title */}
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Sign Up
                <span className="inline-block w-2 h-2 rounded-full bg-primary-500 ml-1 align-super"></span>
              </h1>
              <p className="text-gray-600 mb-6">
                Already have an account?{' '}
                <Link href="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                  Log In
                </Link>
              </p>

              {/* Google & Facebook sign up */}
              <div className="space-y-3 mb-6">
                <div className="flex gap-3">
                  <a
                    href={`${apiBase}/api/auth/google`}
                    className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                    Google
                  </a>
                  <a
                    href={`${apiBase}/api/auth/facebook`}
                    className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                    Facebook
                  </a>
                </div>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  <span className="bg-white px-3">Or continue with</span>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmitRegister)} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                  <input
                    {...register('name', { required: 'Name is required' })}
                    type="text"
                    className="input-global"
                    placeholder="John Doe"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>
                  )}
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Number</label>
                  <input
                    {...register('phone', {
                      validate: (value) => {
                        const email = watch('email');
                        if (!value && !email) {
                          return 'Phone or email is required';
                        }
                        if (value) {
                          const digits = value.replace(/\D/g, '');
                          if (digits.length < 10) return 'Enter a valid 10-digit phone number';
                        }
                        return true;
                      }
                    })}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    className="input-global"
                    placeholder="e.g. 98765 43210 or +91 98765 43210"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone.message as string}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    {...register('email', {
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
                      validate: (value) => {
                        const phone = watch('phone');
                        if (!value && !phone) {
                          return 'Email or phone is required';
                        }
                        return true;
                      }
                    })}
                    type="email"
                    className="input-global"
                    placeholder="name@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <input
                    {...register('password', { minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                    type="password"
                    className="input-global"
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>
                  )}
                </div>

                {/* Hidden referral code */}
                <input
                  {...register('referralCode')}
                  type="hidden"
                />

                {/* Receive Updates Checkbox */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={receiveUpdates}
                    onChange={(e) => setReceiveUpdates(e.target.checked)}
                    className="w-5 h-5 border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary-500 text-primary-600"
                    id="updates"
                  />
                  <label htmlFor="updates" className="text-sm text-gray-700 cursor-pointer">
                    Receive email updates
                  </label>
                </div>

                {/* SIGN UP Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary-global"
                >
                  {isSubmitting ? 'CREATING ACCOUNT...' : 'SIGN UP'}
                </button>

                {/* Privacy Policy & Terms */}
                <p className="text-xs text-gray-500 text-center mt-6">
                  By signing up you agree to our{' '}
                  <Link href="/privacy" className="text-primary-600 hover:text-primary-700 underline">
                    Privacy Policy
                  </Link>
                  {' '}&{' '}
                  <Link href="/terms" className="text-primary-600 hover:text-primary-700 underline">
                    Terms of Service
                  </Link>
                </p>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Account</h2>
              <p className="text-gray-600 mb-8">
                OTP has been sent to <strong>{formData.email || formData.phone}</strong>
              </p>

              <form onSubmit={handleSubmit(onSubmitOTP)} className="space-y-5">
                <div className="text-center mb-6 bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <p className="text-xs text-gray-600">
                    💡 <strong>Development Mode:</strong> Check backend console for OTP
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">Enter OTP Code</label>
                  <input
                    {...register('code', { required: 'OTP is required' })}
                    type="text"
                    maxLength={6}
                    className="input-global text-center text-xl tracking-[0.35em] font-semibold"
                    placeholder="000000"
                  />
                  {errors.code && (
                    <p className="text-red-500 text-xs mt-1 text-center">{errors.code.message as string}</p>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary-global"
                >
                  {isSubmitting ? 'VERIFYING...' : 'VERIFY OTP'}
                </button>
                
                <button
                  type="button"
                  disabled={otpTimer.isActive}
                  onClick={() => {
                    sendOTP({ email: formData.email, phone: formData.phone }, {
                      onSuccess: () => {
                        toast.success('OTP resent successfully');
                        otpTimer.start();
                      },
                    });
                  }}
                  className="w-full text-primary-600 hover:text-primary-700 font-semibold text-sm py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {otpTimer.isActive ? `Resend OTP in ${otpTimer.formatted}` : 'Resend OTP'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Right Side - Image Background */}
      <div 
        className="hidden lg:block bg-cover bg-center relative"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072&auto=format&fit=crop')",
        }}
      >
        {/* Overlay for better contrast */}
        <div className="absolute inset-0 bg-black/10"></div>
      </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}
