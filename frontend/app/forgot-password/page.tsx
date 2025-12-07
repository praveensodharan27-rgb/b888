'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiMail, FiPhone, FiLock } from 'react-icons/fi';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        <h1 className="text-3xl font-bold mb-2">Forgot Password</h1>
        <p className="text-gray-600 mb-6">
          {step === 'request' && 'Enter your email or phone to receive a reset code'}
          {step === 'verify' && 'Enter the OTP code sent to your email/phone'}
          {step === 'reset' && 'Enter the OTP code and your new password'}
        </p>

        {step === 'request' && (
          <form onSubmit={handleSubmit(onSubmitRequest)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email or Phone *</label>
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
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="admin@sellit.com or +1234567890"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message as string}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700"
            >
              Send Reset Code
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleSubmit(onSubmitVerify)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">OTP Code *</label>
              <input
                {...register('code', { required: 'OTP code is required' })}
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
              onClick={() => setStep('request')}
              className="w-full text-primary-600 hover:text-primary-700 text-sm"
            >
              Change Email/Phone
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleSubmit(onSubmitReset)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">OTP Code *</label>
              <input
                {...register('code', { required: 'OTP code is required' })}
                type="text"
                maxLength={6}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-center text-2xl tracking-widest"
                placeholder="000000"
              />
              {errors.code && (
                <p className="text-red-500 text-sm mt-1">{errors.code.message as string}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">New Password *</label>
              <input
                {...register('newPassword', { 
                  required: 'New password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' }
                })}
                type="password"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter new password"
              />
              {errors.newPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.newPassword.message as string}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password *</label>
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
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Confirm new password"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message as string}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700"
            >
              Reset Password
            </button>
          </form>
        )}

        <p className="text-center mt-6 text-gray-600">
          Remember your password?{' '}
          <Link href="/login" className="text-primary-600 hover:text-primary-700">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

