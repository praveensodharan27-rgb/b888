'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import toast from '@/lib/toast';
import { useOTPTimer } from '@/hooks/useOTPTimer';
import { FiArrowLeft, FiMail, FiPhone, FiLock, FiRotateCw } from 'react-icons/fi';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const otpTimer = useOTPTimer(60);
  const { register, handleSubmit, formState: { errors }, watch } = useForm();

  const onSubmitRequest = async (data: any) => {
    try {
      const input = data.email || data.phone || '';
      const isEmail = input.includes('@');
      
      const requestData: { email?: string; phone?: string } = {};
      if (isEmail) {
        requestData.email = input;
        setEmail(input);
      } else if (input) {
        requestData.phone = input;
        setPhone(input);
      }

      const response = await api.post('/auth/forgot-password', requestData);
      
      if (response.data.success) {
        toast.success('OTP sent successfully!');
        otpTimer.start();
        setStep('verify');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    }
  };

  const onSubmitVerify = async (data: any) => {
    try {
      const verifyData: { email?: string; phone?: string; code: string } = {
        code: data.code
      };
      
      if (email) {
        verifyData.email = email;
      } else if (phone) {
        verifyData.phone = phone;
      }

      const response = await api.post('/auth/verify-reset-otp', verifyData);
      
      if (response.data.success) {
        toast.success('OTP verified! Please set your new password');
        setStep('reset');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid OTP');
    }
  };

  const onSubmitReset = async (data: any) => {
    try {
      const resetData: { email?: string; phone?: string; code: string; newPassword: string } = {
        code: data.code,
        newPassword: data.newPassword
      };
      
      if (email) {
        resetData.email = email;
      } else if (phone) {
        resetData.phone = phone;
      }

      const response = await api.post('/auth/reset-password', resetData);
      
      if (response.data.success) {
        toast.success('Password reset successfully!');
        router.push('/login');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gradient-to-b from-primary-50/70 via-white to-primary-50/40 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl shadow-primary-100/80 px-8 py-10 relative">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2">
            <div className="h-16 w-16 rounded-full bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-300/70 ring-4 ring-white">
              {step === 'reset' ? (
                <FiLock className="h-7 w-7 text-white" />
              ) : (
                <FiRotateCw className="h-7 w-7 text-white" />
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {step === 'request' && 'Forgot your password?'}
              {step === 'verify' && 'Enter verification code'}
              {step === 'reset' && 'Set your new password'}
            </h1>
            <p className="mt-2 text-sm text-gray-600 max-w-sm leading-relaxed">
              {step === 'request' && "Enter your email or phone number and we'll send you a code to reset your password."}
              {step === 'verify' && "We sent a 6-digit code to your email or phone. Enter it below."}
              {step === 'reset' && "Enter the code we sent and choose a new password to get back into your account."}
            </p>
          </div>

          <div className="mt-8">
            {step === 'request' && (
              <form onSubmit={handleSubmit(onSubmitRequest)} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-[0.08em]">
                    Email or Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                      <FiMail className="h-4 w-4" />
                    </span>
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
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400 transition"
                      placeholder="e.g. name@email.com or +1 234 567 890"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-300 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 transition"
                >
                  Send Reset Code
                </button>
              </form>
            )}

            {step === 'verify' && (
              <form onSubmit={handleSubmit(onSubmitVerify)} className="space-y-5">
                <div className="flex justify-center">
                  {otpTimer.isActive ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 border border-primary-200 px-4 py-1.5">
                      <span className="text-xs text-gray-600">Resend code in</span>
                      <span className="font-semibold tabular-nums text-primary-600 text-sm min-w-[3ch]">
                        {otpTimer.formatted}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">You can resend the code now</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-[0.08em]">
                    Verification Code
                  </label>
                  <input
                    {...register('code', { required: 'OTP code is required' })}
                    type="text"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-2xl tracking-[0.4em] font-semibold bg-gray-50/60 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                    placeholder="000000"
                  />
                  {errors.code && (
                    <p className="text-red-500 text-xs mt-1">{errors.code.message as string}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-300 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 transition"
                >
                  Verify Code
                </button>
                <button
                  type="button"
                  disabled={otpTimer.isActive}
                  onClick={async () => {
                    try {
                      const requestData: { email?: string; phone?: string } = {};
                      if (email) requestData.email = email;
                      else if (phone) requestData.phone = phone;
                      await api.post('/auth/forgot-password', requestData);
                      toast.success('OTP resent successfully!');
                      otpTimer.start();
                    } catch (err: any) {
                      toast.error(err.response?.data?.message || 'Failed to resend OTP');
                    }
                  }}
                  className="w-full text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {otpTimer.isActive ? `Resend code in ${otpTimer.formatted}` : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="w-full text-xs text-gray-500 hover:text-gray-700"
                >
                  Change email / phone
                </button>
              </form>
            )}

            {step === 'reset' && (
              <form onSubmit={handleSubmit(onSubmitReset)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">
                    Verification Code
                  </label>
                  <input
                    {...register('code', { required: 'OTP code is required' })}
                    type="text"
                    maxLength={6}
                    className="w-full px-4 py-3 border border-primary-200 rounded-xl text-center text-xl tracking-[0.35em] font-medium bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                    placeholder="000000"
                  />
                  {errors.code && (
                    <p className="text-red-500 text-xs mt-1">{errors.code.message as string}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                      <FiLock className="h-4 w-4" />
                    </span>
                    <input
                      {...register('newPassword', { 
                        required: 'New password is required',
                        minLength: { value: 6, message: 'Password must be at least 6 characters' }
                      })}
                      type="password"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-primary-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                      placeholder="e.g. ••••••••"
                    />
                  </div>
                  {errors.newPassword && (
                    <p className="text-red-500 text-xs mt-1">{errors.newPassword.message as string}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                      <FiLock className="h-4 w-4" />
                    </span>
                    <input
                      {...register('confirmPassword', { 
                        required: 'Please confirm your password',
                        validate: (value) => {
                          if (value !== watch('newPassword')) {
                            return 'Passwords do not match';
                          }
                          return true;
                        }
                      })}
                      type="password"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-primary-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
                      placeholder="Confirm new password"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message as string}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full inline-flex justify-center items-center rounded-xl bg-primary-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary-300/50 hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 transition"
                >
                  Set password
                </button>
                <div className="text-center pt-3">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    <FiArrowLeft className="h-4 w-4 shrink-0" />
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between text-xs text-gray-500">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
            <p>
              Remember your password?{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

