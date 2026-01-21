'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { FiX, FiMail, FiPhone, FiLock, FiUser, FiEye, FiEyeOff, FiUserPlus } from 'react-icons/fi';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getOrCreateSessionAuthQuote } from '@/lib/authQuotes';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
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

export default function SignupModal({ isOpen, onClose, onSwitchToLogin }: SignupModalProps) {
  const router = useRouter();
  const { register: registerUser, sendOTP, verifyOTP } = useAuth();
  const [step, setStep] = useState<'register' | 'otp'>('register');
  const [formData, setFormData] = useState<any>({});
  const [receiveUpdates, setReceiveUpdates] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm();
  
  // Typing effect for quote
  const [quoteText, setQuoteText] = useState<string>('');
  const [displayQuote, setDisplayQuote] = useState('');
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Change background image every time modal opens
  useEffect(() => {
    if (isOpen) {
      // Randomly select a new image each time modal opens
      const randomIndex = Math.floor(Math.random() * BACKGROUND_IMAGES.length);
      setBackgroundImage(BACKGROUND_IMAGES[randomIndex]);
    }
  }, [isOpen]);

  // Typing effect for quote
  useEffect(() => {
    if (!isOpen || !quoteText) {
      setDisplayQuote('');
      setQuoteIndex(0);
      setIsDeleting(false);
      return;
    }

    const isAtEnd = quoteIndex >= quoteText.length;
    const isAtStart = quoteIndex <= 0;

    let delay = isDeleting ? 30 : 50;
    if (!isDeleting && isAtEnd) delay = 2000;
    if (isDeleting && isAtStart) delay = 500;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (!isAtEnd) {
          const next = quoteIndex + 1;
          setDisplayQuote(quoteText.slice(0, next));
          setQuoteIndex(next);
        } else {
          setIsDeleting(true);
        }
      } else {
        if (!isAtStart) {
          const next = quoteIndex - 1;
          setDisplayQuote(quoteText.slice(0, next));
          setQuoteIndex(next);
        } else {
          setIsDeleting(false);
        }
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [quoteIndex, isDeleting, quoteText, isOpen]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      reset();
      setStep('register');
      setReceiveUpdates(false);
      setShowPassword(false);
      setIsSubmitting(false);
      setDisplayQuote('');
      setQuoteIndex(0);
      setIsDeleting(false);
    }
  }, [isOpen, reset]);

  // Pick ONE random quote per browser session (same for entire session)
  useEffect(() => {
    if (!isOpen) return;
    const q = getOrCreateSessionAuthQuote();
    setQuoteText(q ? `"${q}"` : '');
  }, [isOpen]);

  // Referral code will be handled via URL when navigating to register page
  // For modal, we don't need searchParams

  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const onSubmitRegister = async (data: any) => {
    try {
      setIsSubmitting(true);
      
      if (!data.email && !data.phone) {
        toast.error('Please provide either email or phone number');
        setIsSubmitting(false);
        return;
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
            onClose();
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

  const onSubmitOTP = async (data: any) => {
    try {
      setIsSubmitting(true);
      verifyOTP({ email: formData.email, phone: formData.phone, code: data.code }, {
        onSuccess: () => {
          setIsSubmitting(false);
          onClose();
          router.push('/');
        },
        onError: () => {
          setIsSubmitting(false);
        }
      });
    } catch (error) {
      setIsSubmitting(false);
      toast.error('An error occurred. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl transform transition-all my-8 relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-20"
          >
            <FiX className="w-5 h-5" />
          </button>

          <div className="flex flex-col lg:flex-row">
            {/* Left Side - Image Background with Overlay Text Only (No Container/Card) */}
            <div 
              className="hidden lg:block lg:w-1/2 bg-cover bg-center relative"
              style={{
                backgroundImage: backgroundImage 
                  ? `url('${backgroundImage}')`
                  : 'linear-gradient(to bottom right, rgb(20, 83, 45), rgb(22, 101, 52), rgb(20, 83, 45))',
                transition: 'background-image 0.5s ease-in-out',
              }}
            >
              {/* Dark overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/65" />

              {/* Overlay Text - Directly on Image, No Container */}
              <div className="absolute inset-0 flex flex-col justify-between p-12 text-white z-10">
                {/* Top: Logo */}
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🌱</span>
                  <span className="text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">SellIt</span>
                </div>

                {/* Center: Main Heading and Sub-heading */}
                <div className="flex flex-col gap-4">
                  <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
                    Join the Green Revolution
                  </h1>
                  <p className="text-white/95 text-lg leading-relaxed max-w-md drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)]">
                    Connect with eco-conscious innovators and build a sustainable future together.
                  </p>
                </div>

                {/* Bottom: Quote with Typing Effect */}
                <p className="text-white text-base italic min-h-[1.5rem] drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]">
                  {displayQuote}
                  <span className="animate-pulse">|</span>
                </p>
              </div>
            </div>

            {/* Right Side - Sign Up Form */}
            <div className="w-full lg:w-1/2 p-8 lg:p-12 flex items-center justify-center bg-white">
              <div className="w-full max-w-md">
            {step === 'register' ? (
              <>
                {/* Title */}
                <div className="mb-8">
                  <h2 className="text-4xl font-bold text-gray-900 mb-3">
                    Create Account
                  </h2>
                  <p className="text-gray-600 text-base">
                    Join our community and start your journey today
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmitRegister)} className="space-y-5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiUser className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('name', { required: 'Name is required' })}
                        type="text"
                        className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-white hover:border-gray-300"
                        placeholder="Enter your full name"
                      />
                    </div>
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                        <span>⚠️</span>
                        {errors.name.message as string}
                      </p>
                    )}
                  </div>

                  {/* Contact Number */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5">Contact Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiPhone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('phone', {
                          validate: (value) => {
                            const email = watch('email');
                            if (!value && !email) {
                              return 'Phone or email is required';
                            }
                            return true;
                          }
                        })}
                        type="tel"
                        className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-white hover:border-gray-300"
                        placeholder="Enter your phone number"
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                        <span>⚠️</span>
                        {errors.phone.message as string}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiMail className="h-5 w-5 text-gray-400" />
                      </div>
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
                        className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-white hover:border-gray-300"
                        placeholder="Enter your email address"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                        <span>⚠️</span>
                        {errors.email.message as string}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FiLock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('password', { 
                          required: 'Password is required',
                          minLength: { value: 6, message: 'Password must be at least 6 characters' } 
                        })}
                        type={showPassword ? 'text' : 'password'}
                        className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 placeholder:text-gray-400 bg-white hover:border-gray-300"
                        placeholder="Create a password"
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

                  {/* Hidden referral code */}
                  <input
                    {...register('referralCode')}
                    type="hidden"
                  />

                  {/* Receive Updates Checkbox */}
                  <div className="flex items-center gap-3 group">
                    <input
                      type="checkbox"
                      checked={receiveUpdates}
                      onChange={(e) => setReceiveUpdates(e.target.checked)}
                      className="w-4 h-4 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-blue-600 cursor-pointer"
                      id="updates"
                    />
                    <label htmlFor="updates" className="text-sm text-gray-700 cursor-pointer group-hover:text-gray-900 transition-colors">
                      I agree to receive email updates and newsletters
                    </label>
                  </div>

                  {/* SIGN UP Button */}
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
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <FiUserPlus className="w-5 h-5" />
                        <span>Create Account</span>
                      </>
                    )}
                  </button>

                  {/* Privacy Policy & Terms */}
                  <p className="text-xs text-gray-500 text-center mt-6">
                    By creating an account, you agree to our{' '}
                    <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline font-medium">
                      Privacy Policy
                    </Link>
                    {' '}and{' '}
                    <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline font-medium">
                      Terms of Service
                    </Link>
                  </p>
                </form>

                {/* Login Link */}
                <div className="text-center mt-6 pt-6 border-t border-gray-200">
                  <p className="text-gray-600 text-sm">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onSwitchToLogin) {
                          onSwitchToLogin();
                        }
                      }}
                      className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* OTP Verification */}
                <div className="text-center lg:text-left mb-8">
                  <h2 className="text-4xl font-bold text-gray-900 mb-3">
                    Verify Your Account
                  </h2>
                  <p className="text-gray-600 text-base">
                    We've sent a verification code to{' '}
                    <strong className="text-gray-900">{formData.email || formData.phone}</strong>
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmitOTP)} className="space-y-5">
                  <div className="text-center mb-6 bg-blue-50 p-4 rounded-xl border-2 border-blue-100">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Development Mode:</strong> Check backend console for OTP
                    </p>
                  </div>
                  
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
                    onClick={() => {
                      sendOTP({ email: formData.email, phone: formData.phone }, {
                        onSuccess: () => toast.success('OTP resent successfully'),
                      });
                    }}
                    className="w-full text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
                  >
                    Resend OTP
                  </button>
                </form>
              </>
            )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

