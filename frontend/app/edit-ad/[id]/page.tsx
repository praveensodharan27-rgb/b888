'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useUpdateAd, useAd } from '@/hooks/useAds';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { FiX, FiUpload, FiNavigation } from 'react-icons/fi';
import ImageWithFallback from '@/components/ImageWithFallback';
import ProductSpecifications from '@/components/ProductSpecifications';
import toast from '@/lib/toast';

export default function EditAdPage() {
  const router = useRouter();
  const params = useParams();
  const adId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: ad, isLoading: adLoading } = useAd(adId);
  const { register, handleSubmit, formState: { errors }, watch, setValue, reset } = useForm();
  const updateAd = useUpdateAd();
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { categories = [], isLoading: categoriesLoading, isError: categoriesError } = useCategories();

  const selectedCategoryId = watch('categoryId');
  const selectedCategory = categories?.find((c: any) => String(c.id) === String(selectedCategoryId));
  const selectedSubcategoryId = watch('subcategoryId');
  const selectedSubcategory = selectedCategory?.subcategories?.find((s: any) => String(s.id) === String(selectedSubcategoryId));


  // Load ad data into form (use category/subcategory id from relation if scalar missing)
  useEffect(() => {
    if (ad) {
      const categoryId = ad.categoryId ?? (ad.category as any)?.id ?? '';
      const subcategoryId = ad.subcategoryId ?? (ad.subcategory as any)?.id ?? '';
      reset({
        title: ad.title,
        description: ad.description,
        price: ad.price,
        originalPrice: ad.originalPrice || '',
        discount: ad.discount || '',
        condition: ad.condition || '',
        categoryId: categoryId ? String(categoryId) : '',
        subcategoryId: subcategoryId ? String(subcategoryId) : '',
        locationId: ad.locationId || '',
        state: ad.state || '',
        city: ad.city || '',
        neighbourhood: ad.neighbourhood || '',
        exactLocation: ad.exactLocation || '',
        attributes: ad.attributes || {},
      });
      // Ensure images is an array and filter out empty/null values
      const imagesArray = Array.isArray(ad.images) 
        ? ad.images.filter((img: any) => img && (typeof img === 'string' ? img.trim() !== '' : true))
        : (ad.images && typeof ad.images === 'string' && ad.images.trim() !== '' ? [ad.images] : []);
      setExistingImages(imagesArray);
      console.log('Loaded existing images:', imagesArray);
      console.log('Loaded existing images:', imagesArray);
    }
  }, [ad, reset]);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router, mounted]);

  // Check if user owns the ad
  useEffect(() => {
    if (ad && isAuthenticated) {
      // This will be checked on the backend, but we can add a check here too
    }
  }, [ad, isAuthenticated]);

  // Show loading during initial mount or while loading
  if (!mounted || authLoading || adLoading) {
    return (
      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !ad) {
    return null;
  }

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsDetectingLocation(true);
    try {
      const { latitude, longitude } = await import('@/utils/geolocation').then((m) => m.getCurrentPosition());

      // Call geocoding API to detect location
      const response = await api.post('/geocoding/detect-location', {
        latitude,
        longitude,
      });

      if (response.data.success) {
        const { detectedLocation } = response.data;

        // Auto-populate state, city, neighbourhood from detected location
        if (detectedLocation) {
          if (detectedLocation.state) {
            setValue('state', detectedLocation.state);
            toast.success(`State detected: ${detectedLocation.state}`);
          }
          if (detectedLocation.city) {
            setValue('city', detectedLocation.city);
            toast.success(`City detected: ${detectedLocation.city}`);
          }
          if (detectedLocation.neighbourhood) {
            setValue('neighbourhood', detectedLocation.neighbourhood);
            toast.success(`Neighbourhood detected: ${detectedLocation.neighbourhood}`);
          }
          
          if (detectedLocation.state || detectedLocation.city || detectedLocation.neighbourhood) {
            toast.success('Location information auto-filled successfully!');
          } else {
            toast.info('Location detected but no detailed information available');
          }
        }
      } else {
        toast.error('Failed to detect location');
      }
    } catch (error: any) {
      console.error('Location detection error:', error);
      const geoCode = error?.code;
      if (geoCode === 1 || geoCode === 'PERMISSION_DENIED') {
        toast.error('Location access denied. Please enable location permissions.');
      } else if (geoCode === 2 || geoCode === 'POSITION_UNAVAILABLE') {
        toast.error('Location information unavailable');
      } else if (geoCode === 3 || geoCode === 'TIMEOUT') {
        toast.error('Location request timed out');
      } else {
        toast.error(error.response?.data?.message || 'Failed to detect location');
      }
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + images.length + files.length;
    if (totalImages > 4) {
      alert('Maximum 4 images allowed');
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const removeExistingImage = (index: number) => {
    const newExisting = existingImages.filter((_, i) => i !== index);
    setExistingImages(newExisting);
  };

  const onSubmit = async (data: any) => {
    const totalImages = existingImages.length + images.length;
    if (totalImages === 0) {
      alert('Please keep at least one image');
      return;
    }

    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('price', data.price);
    if (data.originalPrice) {
      formData.append('originalPrice', data.originalPrice);
      // Calculate discount automatically
      const discount = ((parseFloat(data.originalPrice) - parseFloat(data.price)) / parseFloat(data.originalPrice) * 100).toFixed(2);
      formData.append('discount', discount);
    }
    if (data.condition) formData.append('condition', data.condition);
    formData.append('categoryId', data.categoryId);
    if (data.subcategoryId) formData.append('subcategoryId', data.subcategoryId);
    // Location fields - include all location data
    if (data.locationId) formData.append('locationId', data.locationId);
    formData.append('state', data.state || '');
    formData.append('city', data.city || '');
    if (data.neighbourhood) formData.append('neighbourhood', data.neighbourhood);
    if (data.exactLocation) formData.append('exactLocation', data.exactLocation);
    
    // Add attributes (technical details) - always send so DB is updated
    // Clean attributes: remove empty strings and null values, and remove price (sent at root level)
    const cleanedAttributes: any = {};
    if (data.attributes && typeof data.attributes === 'object') {
      Object.keys(data.attributes).forEach(key => {
        // Skip price field - it's sent at root level, not in attributes
        if (key === 'price') return;
        const value = data.attributes[key];
        // Only include non-empty values
        if (value !== null && value !== undefined && value !== '') {
          cleanedAttributes[key] = value;
        }
      });
    }
    formData.append('attributes', JSON.stringify(cleanedAttributes));

    // Add specifications if they exist
    if (data._specifications && Array.isArray(data._specifications) && data._specifications.length > 0) {
      formData.append('specifications', JSON.stringify(data._specifications));
    }
    
    // Append existing images that should be kept
    existingImages.forEach((img) => {
      formData.append('existingImages', img);
    });

    // Append new images
    images.forEach((image) => {
      formData.append('images', image);
    });

    setIsSubmitting(true);
    updateAd.mutate(
      { id: adId, data: formData },
      {
        onSettled: () => setIsSubmitting(false),
        onSuccess: () => {
          router.push('/my-ads');
        },
      }
    );
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Edit Ad</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Title *</label>
          <input
            {...register('title', { required: 'Title is required' })}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Enter ad title"
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title.message as string}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description *</label>
          <textarea
            {...register('description', { required: 'Description is required' })}
            rows={6}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Describe your item in detail"
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description.message as string}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Price (₹) *</label>
            <input
              type="number"
              step="0.01"
              {...register('price', { required: 'Price is required', min: 0 })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0.00"
            />
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price.message as string}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Original Price (₹)</label>
            <input
              type="number"
              step="0.01"
              {...register('originalPrice', { min: 0 })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Original price (optional)"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty if no discount</p>
          </div>
        </div>

        {/* Discount is automatically calculated from originalPrice - price */}

        <div>
          <label className="block text-sm font-medium mb-2">Condition</label>
          <select
            {...register('condition')}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select Condition</option>
            <option value="NEW">New</option>
            <option value="LIKE_NEW">Like New</option>
            <option value="USED">Used</option>
            <option value="REFURBISHED">Refurbished</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category *</label>
            <select
              {...register('categoryId', { required: 'Category is required' })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={categoriesLoading}
              aria-label="Category"
            >
              <option value="">{categoriesLoading ? 'Loading categories...' : 'Select Category'}</option>
              {Array.isArray(categories) && categories.length > 0 ? (
                categories.map((cat: any) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </option>
                ))
              ) : (
                !categoriesLoading && <option value="" disabled>No categories available</option>
              )}
            </select>
            {categoriesError && (
              <p className="text-red-500 text-sm mt-1">Failed to load categories. Please refresh the page.</p>
            )}
            {errors.categoryId && (
              <p className="text-red-500 text-sm mt-1">{errors.categoryId.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Subcategory <span className="text-red-500">*</span>
            </label>
            <select
              {...register('subcategoryId', { required: 'Subcategory is required' })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.subcategoryId ? 'border-red-500' : ''
              }`}
              disabled={!selectedCategory}
              aria-label="Subcategory"
            >
              <option value="">{selectedCategory ? 'Select Subcategory' : 'Select category first'}</option>
              {selectedCategory?.subcategories?.map((sub: any) => (
                <option key={sub.id} value={String(sub.id)}>
                  {sub.name}
                </option>
              ))}
            </select>
            {errors.subcategoryId && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.subcategoryId.message as string}
              </p>
            )}
          </div>
        </div>


        {/* State, City, Neighbourhood Fields */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Location Information</label>
            <button
              type="button"
              onClick={detectLocation}
              disabled={isDetectingLocation}
              className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isDetectingLocation ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700"></div>
                  Detecting...
                </>
              ) : (
                <>
                  <FiNavigation className="w-3 h-3" />
                  Auto Detect Location
                </>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <input
                {...register('state')}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="State (auto-filled)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <input
                {...register('city')}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="City (auto-filled)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Neighbourhood</label>
              <input
                {...register('neighbourhood')}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Neighbourhood/Area (auto-filled)"
              />
            </div>
          </div>
        </div>

        {/* Product Specifications - Show when category and subcategory are selected; pass current ad attributes for edit */}
        {(selectedCategory || ad?.category) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <ProductSpecifications
              adId={adId}
              categorySlug={selectedCategory?.slug || (ad?.category as any)?.slug}
              subcategorySlug={selectedSubcategory?.slug || (ad?.subcategory as any)?.slug}
              initialAttributes={ad?.attributes && typeof ad.attributes === 'object' ? ad.attributes : undefined}
              register={register}
              watch={watch}
              setValue={setValue}
              errors={errors}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Images (Max 4) *</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Existing images */}
            {existingImages.map((img, index) => (
              <div key={`existing-${index}`} className="relative">
                <div className="w-full h-32 rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src={img}
                    alt={`Existing ${index + 1}`}
                    width={200}
                    height={128}
                    className="w-full h-32 object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeExistingImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-10"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {/* New image previews */}
            {previews.map((preview, index) => (
              <div key={`new-${index}`} className="relative">
                <div className="w-full h-32 rounded-lg overflow-hidden">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-10"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {/* Upload button */}
            {existingImages.length + previews.length < 4 && (
              <label className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center cursor-pointer hover:border-primary-500">
                <FiUpload className="w-6 h-6 text-gray-400" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
          {existingImages.length + images.length === 0 && (
            <p className="text-red-500 text-sm">At least one image is required</p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || updateAd.isPending}
            className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting || updateAd.isPending ? 'Updating...' : 'Update Ad'}
          </button>
        </div>
      </form>
    </div>
  );
}

