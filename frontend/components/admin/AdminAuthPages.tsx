'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { FiSave, FiImage, FiType, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminAuthPages() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch login settings
  const { data: loginData, isLoading: loginLoading } = useQuery({
    queryKey: ['auth-settings', 'login'],
    queryFn: async () => {
      const response = await api.get('/auth-settings/login');
      return response.data.settings;
    },
  });

  // Fetch signup settings
  const { data: signupData, isLoading: signupLoading } = useQuery({
    queryKey: ['auth-settings', 'signup'],
    queryFn: async () => {
      const response = await api.get('/auth-settings/signup');
      return response.data.settings;
    },
  });

  const currentData = activeTab === 'login' ? loginData : signupData;

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    tagline: '',
    imageUrl: '',
    backgroundColor: '',
  });

  // Update form when data changes
  useEffect(() => {
    if (currentData) {
      setFormData({
        title: currentData.title || '',
        subtitle: currentData.subtitle || '',
        tagline: currentData.tagline || '',
        imageUrl: currentData.imageUrl || '',
        backgroundColor: currentData.backgroundColor || '',
      });
    }
  }, [currentData]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Updating auth settings:', { page: activeTab, data });
      const response = await api.put(`/auth-settings/${activeTab}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Update successful:', data);
      toast.success(`${activeTab === 'login' ? 'Login' : 'Signup'} page updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ['auth-settings', activeTab] });
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update settings';
      const validationErrors = error.response?.data?.errors;
      
      if (validationErrors && validationErrors.length > 0) {
        // Show validation errors
        validationErrors.forEach((err: any) => {
          toast.error(`${err.path || err.param}: ${err.msg}`);
        });
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting form data:', formData);
    
    // Validate required fields
    if (!formData.title?.trim() || !formData.subtitle?.trim()) {
      toast.error('Title and Subtitle are required');
      return;
    }
    
    // Clean the data - remove empty strings, send only defined values
    const cleanData: any = {};
    if (formData.title) cleanData.title = formData.title.trim();
    if (formData.subtitle) cleanData.subtitle = formData.subtitle.trim();
    if (formData.tagline) cleanData.tagline = formData.tagline.trim();
    if (formData.imageUrl) cleanData.imageUrl = formData.imageUrl.trim();
    if (formData.backgroundColor) cleanData.backgroundColor = formData.backgroundColor.trim();
    
    console.log('Clean data to send:', cleanData);
    updateMutation.mutate(cleanData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/auth-settings/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        handleChange('imageUrl', response.data.imageUrl);
        toast.success('Image uploaded successfully!');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  if (loginLoading || signupLoading) {
    return <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Auth Pages Customization</h2>
            <p className="text-sm text-gray-600 mt-1">Customize login and signup modal images and text</p>
          </div>
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <FiEye className="w-4 h-4" />
            {previewOpen ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => {
                setActiveTab('login');
                if (loginData) {
                  setFormData({
                    title: loginData.title || '',
                    subtitle: loginData.subtitle || '',
                    tagline: loginData.tagline || '',
                    imageUrl: loginData.imageUrl || '',
                    backgroundColor: loginData.backgroundColor || '',
                  });
                }
              }}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === 'login'
                  ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              🔐 Login Modal
            </button>
            <button
              onClick={() => {
                setActiveTab('signup');
                if (signupData) {
                  setFormData({
                    title: signupData.title || '',
                    subtitle: signupData.subtitle || '',
                    tagline: signupData.tagline || '',
                    imageUrl: signupData.imageUrl || '',
                    backgroundColor: signupData.backgroundColor || '',
                  });
                }
              }}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === 'signup'
                  ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              📝 Signup Modal
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Text Content Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FiType className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-bold text-gray-900">Text Content</h3>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Title (e.g., "SellIt.")
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="SellIt."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subtitle
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Buy & Sell Anything Today"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tagline / Welcome Message
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={activeTab === 'login' ? 'Welcome Back!' : 'Start Selling Today!'}
              />
            </div>
          </div>

          {/* Image Section */}
          <div className="space-y-4 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <FiImage className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-bold text-gray-900">Background Image</h3>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Background Image
              </label>
              
              {/* Upload Button */}
              <div className="flex gap-3 mb-3">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <div className={`
                    flex items-center justify-center gap-2 px-4 py-3 
                    bg-gradient-to-r from-blue-600 to-blue-700 text-white 
                    rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl
                    hover:from-blue-700 hover:to-blue-800
                    ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}>
                    {uploading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FiImage className="w-5 h-5" />
                        Upload Local Image
                      </>
                    )}
                  </div>
                </label>
              </div>

              {/* Or use URL */}
              <div className="relative mb-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-gray-500">or use image URL</span>
                </div>
              </div>

              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => handleChange('imageUrl', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://images.unsplash.com/photo-... or uploaded image URL"
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Upload from computer or paste{' '}
                <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Unsplash
                </a>
                {' '}link
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Overlay Color (Hex)
              </label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="w-16 h-12 border-2 border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.backgroundColor}
                  onChange={(e) => handleChange('backgroundColor', e.target.value)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#6b21a8"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Suggested: {activeTab === 'login' ? 'Purple (#6b21a8)' : 'Orange (#ea580c)'}
              </p>
            </div>

            {/* Image Preview */}
            {formData.imageUrl && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Image Preview
                </label>
                <div className="relative w-full h-48 rounded-lg overflow-hidden">
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div 
                    className="absolute inset-0" 
                    style={{ backgroundColor: formData.backgroundColor, opacity: 0.85 }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold">{formData.title}</h3>
                      <p className="text-sm opacity-90 mt-1">{formData.subtitle}</p>
                      {formData.tagline && (
                        <p className="text-lg font-semibold mt-4">{formData.tagline}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                if (currentData) {
                  setFormData({
                    title: currentData.title || '',
                    subtitle: currentData.subtitle || '',
                    tagline: currentData.tagline || '',
                    imageUrl: currentData.imageUrl || '',
                    backgroundColor: currentData.backgroundColor || '',
                  });
                }
                toast.success('Changes reset');
              }}
              className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-semibold transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Tips */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="font-bold text-blue-900 mb-3">💡 Quick Tips:</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Use high-quality images from Unsplash (1920x1080 recommended)</li>
          <li>• Keep titles short and memorable</li>
          <li>• Test different overlay colors for best readability</li>
          <li>• Changes appear immediately after saving</li>
          <li>• Login page uses purple theme, Signup uses orange theme</li>
        </ul>
      </div>
    </div>
  );
}

