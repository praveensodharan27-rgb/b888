'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiArrowLeft, FiUser, FiMail, FiPhone, FiSave, FiCamera } from 'react-icons/fi';
import Link from 'next/link';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user, isLoading, updateUser } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    showPhone: true
  });

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        showPhone: user.showPhone !== undefined ? user.showPhone : true
      });
    }
  }, [user, isLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload avatar
    setUploadingAvatar(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.put('/user/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Update the user in the auth context
        if (updateUser) {
          updateUser({ avatar: response.data.user.avatar });
        }
        setMessage({ type: 'success', text: 'Profile photo updated successfully!' });
      }
    } catch (error: any) {
      console.error('Upload avatar error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to upload photo. Please try again.' 
      });
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const response = await api.put('/user/profile', formData);
      
      if (response.data.success) {
        // Update the user in the auth context
        if (updateUser) {
          updateUser(response.data.user);
        }
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        
        // Redirect back to profile after 2 seconds
        setTimeout(() => {
          router.push('/profile');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Update profile error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update profile. Please try again.' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/profile" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <FiArrowLeft className="w-5 h-5" />
            <span>Back to Profile</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">Manage your profile information</p>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* Profile Picture Section */}
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h2>
            <div className="flex items-center gap-6">
              {/* Avatar Display */}
              <div className="relative">
                {avatarPreview || user.avatar ? (
                  <img
                    src={avatarPreview || user.avatar}
                    alt={user.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>

              <div>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
                <label
                  htmlFor="avatar-upload"
                  className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
                    uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <FiCamera className="w-4 h-4" />
                  {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                </label>
                <p className="text-sm text-gray-500 mt-2">JPG, PNG or WebP. Max size of 5MB</p>
              </div>
            </div>
          </div>

          {/* Profile Information Form */}
          <form onSubmit={handleSubmit}>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Personal Information</h2>

            {/* Success/Error Message */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {message.text}
              </div>
            )}

            {/* Name Field */}
            <div className="mb-6">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
              {user.email !== formData.email && (
                <p className="text-sm text-amber-600 mt-2">
                  ⚠️ Changing your email will require re-verification
                </p>
              )}
            </div>

            {/* Phone Field */}
            <div className="mb-6">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiPhone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>
              {user.phone !== formData.phone && formData.phone && (
                <p className="text-sm text-amber-600 mt-2">
                  ⚠️ Changing your phone will require re-verification
                </p>
              )}
            </div>

            {/* Bio/About Field */}
            <div className="mb-6">
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                About / Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={5}
                maxLength={500}
                className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Tell others about yourself, your interests, and what you're looking for..."
              />
              <p className="text-sm text-gray-500 mt-2">
                {formData.bio.length}/500 characters
              </p>
            </div>

            {/* Privacy Settings */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Privacy Settings</h3>
              
              {/* Show Phone Number Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label htmlFor="showPhone" className="text-sm font-medium text-gray-700">
                    Show Phone Number on Profile
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    When enabled, your phone number will be visible to other users on your profile
                  </p>
                </div>
                <div className="flex items-center ml-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.showPhone}
                    onClick={() => setFormData(prev => ({ ...prev, showPhone: !prev.showPhone }))}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      formData.showPhone ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.showPhone ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
              <Link
                href="/profile"
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-center"
              >
                Cancel
              </Link>
            </div>
          </form>

          {/* Account Information */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Account Status:</span>
                <span className="font-medium text-green-600">
                  {user.isVerified ? '✓ Verified' : 'Unverified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Member Since:</span>
                <span className="font-medium text-gray-900">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '2024'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Account Type:</span>
                <span className="font-medium text-gray-900">Free Member</span>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Security */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Security</h2>
          <div className="space-y-4">
            <Link
              href="/blocked-users"
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              <div>
                <h3 className="font-medium text-gray-900">Blocked Users</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Manage users you've blocked
                </p>
              </div>
              <span className="text-blue-600 hover:text-blue-700">→</span>
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mt-6 border border-red-200">
          <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Delete Account</h3>
              <p className="text-sm text-gray-600 mt-1">
                Permanently delete your account and all associated data
              </p>
            </div>
            <button 
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
              disabled
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

