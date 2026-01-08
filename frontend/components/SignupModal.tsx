'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { FiX, FiChevronDown } from 'react-icons/fi';
import Link from 'next/link';
import toast from 'react-hot-toast';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm();

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
      setStep('register');
      setReceiveUpdates(false);
      setIsSubmitting(false);
    }
  }, [isOpen, reset]);

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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
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
                {/* Top Area - Empty for visual balance */}
                <div></div>

                {/* Center Message - Empty for visual balance */}
                <div></div>

                {/* Bottom - Logo and Text */}
                <div className="flex flex-col items-start gap-3">
                  <span className="text-4xl font-bold text-white">
                    SellIt
                  </span>
                  <h2 className="text-3xl font-bold">Join the Green Revolution</h2>
                  <p className="text-green-50 text-base">
                    Connect with eco-conscious innovators and build a sustainable future together.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Sign Up Form */}
            <div className="w-full lg:w-1/2 p-8 lg:p-12 flex items-center justify-center">
              <div className="w-full max-w-md">
            {step === 'register' ? (
              <>
                {/* Title */}
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Sign Up
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-500 ml-1 align-super"></span>
                </h2>
                <p className="text-gray-600 mb-8">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onSwitchToLogin) {
                        onSwitchToLogin();
                      }
                    }}
                    className="text-orange-500 hover:text-orange-600 font-semibold"
                  >
                    Log In
                  </button>
                </p>

                <form onSubmit={handleSubmit(onSubmitRegister)} className="space-y-5">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                    <input
                      {...register('name', { required: 'Name is required' })}
                      type="text"
                      className="w-full px-4 py-3 border-2 border-orange-500 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                      placeholder=""
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>
                    )}
                  </div>

                  {/* Country (Phone) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
                    <div className="relative">
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
                        className="w-full px-4 py-3 border-2 border-orange-500 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 pr-10"
                        placeholder="+1234567890"
                      />
                      <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                    </div>
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
                      className="w-full px-4 py-3 border-2 border-orange-500 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                      placeholder=""
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
                      className="w-full px-4 py-3 border-2 border-orange-500 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900"
                      placeholder=""
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
                      className="w-5 h-5 border-2 border-gray-300 rounded focus:ring-2 focus:ring-orange-500 text-orange-500"
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
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3.5 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'CREATING ACCOUNT...' : 'SIGN UP'}
                  </button>

                  {/* Privacy Policy & Terms */}
                  <p className="text-xs text-gray-500 text-center mt-4">
                    By signing up you agree to our{' '}
                    <Link href="/privacy" className="text-gray-600 hover:text-gray-800 underline">
                      Privacy Policy
                    </Link>
                    {' '}&{' '}
                    <Link href="/terms" className="text-gray-600 hover:text-gray-800 underline">
                      Terms of Service
                    </Link>
                  </p>
                </form>
              </>
            ) : (
              <>
                {/* OTP Verification */}
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Account</h2>
                <p className="text-gray-600 mb-8">
                  OTP has been sent to <strong>{formData.email || formData.phone}</strong>
                </p>

                <form onSubmit={handleSubmit(onSubmitOTP)} className="space-y-5">
                  <div className="text-center mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-xs text-gray-500">
                      💡 <strong>Development Mode:</strong> Check backend console for OTP
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">Enter OTP Code</label>
                    <input
                      {...register('code', { required: 'OTP is required' })}
                      type="text"
                      maxLength={6}
                      className="w-full px-4 py-3 border-2 border-orange-500 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-center text-2xl tracking-widest font-bold text-gray-900"
                      placeholder="000000"
                    />
                    {errors.code && (
                      <p className="text-red-500 text-xs mt-1 text-center">{errors.code.message as string}</p>
                    )}
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3.5 rounded-lg font-bold text-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    {isSubmitting ? 'VERIFYING...' : 'VERIFY OTP'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      sendOTP({ email: formData.email, phone: formData.phone }, {
                        onSuccess: () => toast.success('OTP resent successfully'),
                      });
                    }}
                    className="w-full text-orange-500 hover:text-orange-600 font-semibold transition-colors"
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

