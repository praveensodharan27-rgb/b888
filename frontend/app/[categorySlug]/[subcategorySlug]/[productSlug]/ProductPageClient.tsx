'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToggleFavorite, useIsFavorite } from '@/hooks/useAds';
import { useComparison } from '@/hooks/useComparison';
import ImageWithFallback from '@/components/ImageWithFallback';
import { format } from 'date-fns';
import { FiHeart, FiShare2, FiMessageCircle, FiCopy, FiCheck, FiMail, FiFacebook, FiTwitter, FiLink, FiPhone, FiBarChart2, FiInfo, FiDollarSign, FiX, FiEdit2 } from 'react-icons/fi';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ProductPageClientProps {
  data: {
    product: any;
    category: {
      id: string;
      name: string;
      slug: string;
    };
    subcategory: {
      id: string;
      name: string;
      slug: string;
    };
  };
  categorySlug: string;
  subcategorySlug: string;
  productSlug: string;
}

export default function ProductPageClient({ 
  data, 
  categorySlug, 
  subcategorySlug, 
  productSlug 
}: ProductPageClientProps) {
  const { product, category, subcategory } = data;
  const { isAuthenticated, user } = useAuth();
  const { data: isFavorite } = useIsFavorite(product.id, isAuthenticated);
  const toggleFavorite = useToggleFavorite();
  const { addToComparison, removeFromComparison, isInComparison, canAddMore } = useComparison();
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showAllImages, setShowAllImages] = useState(false);
  
  // Check if current user is the ad owner
  const isOwner = user?.id === product?.user?.id;

  // Filter and normalize images
  const validImages = (product.images || [])
    .filter((img: any) => {
      if (!img) return false;
      const imgStr = typeof img === 'string' ? img.trim() : String(img).trim();
      return imgStr !== '' && imgStr !== 'null' && imgStr !== 'undefined';
    })
    .map((img: any) => {
      const imgStr = typeof img === 'string' ? img.trim() : String(img).trim();
      if (imgStr.startsWith('/uploads/')) {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
        return `${baseUrl}${imgStr}`;
      }
      return imgStr;
    });

  const images = validImages.map((img: string) => ({
    original: img,
    thumbnail: img,
  }));
  const activeImage = images[activeImageIndex]?.original || null;
  const previewLimit = 4;
  const previewImages = images.slice(0, previewLimit);
  const remainingImageCount = Math.max(images.length - previewLimit, 0);

  const getShareUrl = () => {
    return typeof window !== 'undefined' ? window.location.href : '';
  };

  const getShareText = () => {
    return `${product.title} - ₹${product.price.toLocaleString('en-IN')}`;
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
      setShowShareMenu(false);
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
        setShowShareMenu(false);
      } catch (err) {
        toast.error('Failed to copy link');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const handleEmailShare = () => {
    const url = getShareUrl();
    const subject = encodeURIComponent(product.title);
    const body = encodeURIComponent(`${getShareText()}\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShowShareMenu(false);
    toast.success('Opening email client...');
  };

  const handleFacebookShare = () => {
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleTwitterShare = () => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(getShareText());
    window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleWebShare = async () => {
    const url = getShareUrl();
    const shareData = {
      title: product.title,
      text: getShareText(),
      url: url,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Shared successfully!');
        setShowShareMenu(false);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Share error:', error);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleMakeOffer = () => {
    if (!isAuthenticated) {
      toast.error('Please login to make an offer');
      window.location.href = '/login';
      return;
    }
    setShowOfferModal(true);
  };

  const handleSubmitOffer = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      toast.error('Please enter a valid offer amount');
      return;
    }

    const offer = parseFloat(offerAmount);
    if (offer >= product.price) {
      toast.error('Your offer should be less than the listed price');
      return;
    }

    setIsSubmittingOffer(true);
    try {
      const offerMessage = `I would like to make an offer of ₹${offer.toLocaleString('en-IN')} for "${product.title}"`;
      const chatUrl = `/chat?adId=${product.id}&userId=${product.user?.id}&message=${encodeURIComponent(offerMessage)}`;
      window.location.href = chatUrl;
    } catch (error) {
      console.error('Error submitting offer:', error);
      toast.error('Failed to submit offer. Please try again.');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-600">
        <Link href="/" className="hover:text-primary-600">Home</Link>
        <span className="mx-2">/</span>
        <Link href={`/${categorySlug}`} className="hover:text-primary-600">
          {category.name}
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/${categorySlug}/${subcategorySlug}`} className="hover:text-primary-600">
          {subcategory.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="mb-6">
              {activeImage ? (
                <>
                  <div className="relative w-full rounded-3xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm">
                    <div className="relative w-full overflow-hidden rounded-2xl bg-gray-100">
                      <img
                        src={activeImage}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        style={{ minHeight: 420 }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.src.includes('via.placeholder.com')) {
                            target.src = 'https://via.placeholder.com/1200x900?text=Image+Not+Available';
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4">
                    {previewImages.map((img: string, index: number) => {
                      const actualIndex = index;
                      const isExtraTile = remainingImageCount > 0 && index === previewImages.length - 1;

                      if (isExtraTile) {
                        return (
                          <button
                            key={`extra-${index}`}
                            onClick={() => setShowAllImages(true)}
                            className="w-20 h-20 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-sm font-semibold text-gray-600 bg-white hover:border-primary-300 hover:text-primary-600 transition-all"
                          >
                            +{remainingImageCount}
                          </button>
                        );
                      }

                      return (
                        <button
                          key={img.original + index}
                          onClick={() => setActiveImageIndex(actualIndex)}
                          className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                            activeImageIndex === actualIndex
                              ? 'border-primary-500 shadow-sm'
                              : 'border-transparent hover:border-gray-200'
                          }`}
                        >
                          <img
                            src={img.thumbnail}
                            alt={`${product.title} thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="w-full h-96 bg-gray-200 rounded flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-6xl mb-4 block">📷</span>
                    <p className="text-gray-500">No Images Available</p>
                  </div>
                </div>
              )}
            </div>

            <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
            <p className="text-4xl font-bold text-primary-600 mb-6">
              ₹{product.price.toLocaleString()}
            </p>

            <div className="border-t border-b py-4 my-6">
              <h2 className="text-xl font-semibold mb-2">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
            </div>

            {/* Product Specifications */}
            {product.attributes && typeof product.attributes === 'object' && Object.keys(product.attributes).length > 0 && (
              <div className="border-t border-b py-4 my-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FiInfo className="w-5 h-5 text-blue-600" />
                  Product Specifications
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(product.attributes as Record<string, any>).map(([key, value]) => {
                    if (value === null || value === undefined || value === '') return null;
                    
                    const formattedKey = key
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, l => l.toUpperCase());
                    
                    const displayValue = Array.isArray(value) 
                      ? value.join(', ') 
                      : String(value);
                    
                    return (
                      <div key={key} className="flex flex-col p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600 font-medium mb-1">{formattedKey}</span>
                        <span className="text-base text-gray-900 font-semibold">{displayValue}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Category:</span>
                <Link href={`/${categorySlug}`} className="ml-2 font-semibold hover:text-primary-600">
                  {category.name}
                </Link>
              </div>
              {product.subcategory && (
                <div>
                  <span className="text-gray-500">Subcategory:</span>
                  <Link href={`/${categorySlug}/${subcategorySlug}`} className="ml-2 font-semibold hover:text-primary-600">
                    {subcategory.name}
                  </Link>
                </div>
              )}
              <div>
                <span className="text-gray-500">Location:</span>
                <span className="ml-2 font-semibold">{product.location?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500">Posted:</span>
                <span className="ml-2 font-semibold">
                  {format(new Date(product.createdAt), 'MMM d, yyyy')}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Views:</span>
                <span className="ml-2 font-semibold">{product.views}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 mb-6 sticky top-20">
            {product.user ? (
              <Link 
                href={`/user/${product.user.id}`}
                className="flex items-center gap-4 mb-6 hover:bg-gray-50 p-3 -m-3 rounded-lg transition-colors"
              >
                {product.user.avatar ? (
                  <ImageWithFallback
                    src={product.user.avatar}
                    alt={product.user.name || 'Seller'}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">{(product.user.name || 'S')[0].toUpperCase()}</span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold hover:text-primary-600 transition-colors">
                    {product.user.name || 'Unknown Seller'}
                  </h3>
                  <p className="text-sm text-gray-500">Seller • Click to view profile</p>
                  {product.user.phone && product.user.showPhone !== false ? (
                    <a 
                      href={`tel:${product.user.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-1"
                    >
                      <FiPhone className="w-4 h-4" />
                      {product.user.phone}
                    </a>
                  ) : product.user.showPhone === false ? (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <FiPhone className="w-3 h-3" />
                      Phone hidden by seller
                    </p>
                  ) : null}
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">?</span>
                </div>
                <div>
                  <h3 className="font-semibold">Seller Information Unavailable</h3>
                  <p className="text-sm text-gray-500">Seller</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (isAuthenticated) {
                    toggleFavorite.mutate(product.id);
                  } else {
                    window.location.href = '/login';
                  }
                }}
                disabled={toggleFavorite.isPending}
                className={`w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  isFavorite
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${toggleFavorite.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FiHeart className={isFavorite ? 'fill-current' : ''} /> 
                {toggleFavorite.isPending 
                  ? 'Loading...' 
                  : isFavorite 
                    ? 'Remove from Favorites' 
                    : 'Add to Favorites'}
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  if (isInComparison(product.id)) {
                    removeFromComparison(product.id);
                    toast.success('Removed from comparison');
                  } else {
                    if (!canAddMore) {
                      toast.error(`You can compare up to 4 items. Remove an item first.`);
                      return;
                    }
                    addToComparison(product as any);
                    toast.success('Added to comparison');
                  }
                }}
                className={`w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                  isInComparison(product.id)
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiBarChart2 className={isInComparison(product.id) ? 'fill-current' : ''} /> 
                {isInComparison(product.id) 
                  ? 'Remove from Comparison' 
                  : 'Add to Comparison'}
              </button>

              {isAuthenticated && product.user && !isOwner && (
                <>
                  <button
                    onClick={handleMakeOffer}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors font-semibold"
                  >
                    <FiDollarSign /> Make Offer
                  </button>
                  <Link
                    href={`/chat?adId=${product.id}&userId=${product.user.id}`}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-primary-700"
                  >
                    <FiMessageCircle /> Contact Seller
                  </Link>
                </>
              )}

              {isAuthenticated && isOwner && (
                <Link
                  href={`/edit-ad/${product.id}`}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors font-semibold"
                >
                  <FiEdit2 /> Edit Your Ad
                </Link>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                >
                  {copied ? (
                    <>
                      <FiCheck className="w-4 h-4 text-green-600" /> Copied!
                    </>
                  ) : (
                    <>
                      <FiShare2 className="w-4 h-4" /> Share
                    </>
                  )}
                </button>

                {showShareMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowShareMenu(false)}
                    />
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                      <button
                        onClick={handleCopyLink}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <FiLink className="w-5 h-5 text-gray-600" />
                        <span>Copy Link</span>
                      </button>
                      <button
                        onClick={handleEmailShare}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <FiMail className="w-5 h-5 text-gray-600" />
                        <span>Email</span>
                      </button>
                      <button
                        onClick={handleFacebookShare}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <FiFacebook className="w-5 h-5 text-blue-600" />
                        <span>Facebook</span>
                      </button>
                      <button
                        onClick={handleTwitterShare}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        <FiTwitter className="w-5 h-5 text-blue-400" />
                        <span>Twitter</span>
                      </button>
                      {typeof navigator !== 'undefined' && typeof navigator.share !== 'undefined' && (
                        <button
                          onClick={handleWebShare}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-200"
                        >
                          <FiShare2 className="w-5 h-5 text-gray-600" />
                          <span>More Options</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {product.isPremium && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-semibold text-yellow-800">
                  ⭐ Premium {product.premiumType} Ad
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Make Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Make an Offer</h2>
              <button
                onClick={() => {
                  setShowOfferModal(false);
                  setOfferAmount('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-gray-600 mb-2">Item: <span className="font-semibold">{product.title}</span></p>
              <p className="text-gray-600 mb-4">Listed Price: <span className="font-semibold text-primary-600">₹{product.price.toLocaleString('en-IN')}</span></p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Offer Amount (₹)
              </label>
              <input
                type="number"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="Enter your offer"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                min="0"
                step="0.01"
                max={product.price}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter an amount less than ₹{product.price.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOfferModal(false);
                  setOfferAmount('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSubmittingOffer}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOffer}
                disabled={isSubmittingOffer || !offerAmount || parseFloat(offerAmount) <= 0 || parseFloat(offerAmount) >= product.price}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {isSubmittingOffer ? 'Submitting...' : 'Submit Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAllImages && images.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <p className="text-sm text-gray-500">Gallery</p>
                <h3 className="text-lg font-semibold">{product.title}</h3>
              </div>
              <button
                onClick={() => setShowAllImages(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                aria-label="Close gallery"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((img, index) => (
                  <button
                    key={`${img.original}-${index}`}
                    onClick={() => {
                      setActiveImageIndex(index);
                      setShowAllImages(false);
                    }}
                    className={`rounded-xl overflow-hidden border-2 transition-all ${
                      activeImageIndex === index ? 'border-primary-500 shadow' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={img.original}
                      alt={`${product.title} image ${index + 1}`}
                      className="w-full h-48 object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

