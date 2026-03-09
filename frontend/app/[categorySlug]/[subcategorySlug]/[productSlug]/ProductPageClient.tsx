'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/contexts/AuthModalContext';
import { useToggleFavorite, useIsFavorite, useAds } from '@/hooks/useAds';
import { useComparison } from '@/hooks/useComparison';
import ImageWithFallback from '@/components/ImageWithFallback';
import { format, formatDistanceToNow } from 'date-fns';
import { FiHeart, FiShare2, FiMessageCircle, FiCopy, FiCheck, FiMail, FiFacebook, FiTwitter, FiLink, FiPhone, FiBarChart2, FiDollarSign, FiX, FiEdit2, FiMapPin, FiShield, FiUser } from 'react-icons/fi';
import Link from 'next/link';
import toast from '@/lib/toast';
import LazyAdCard from '@/components/LazyAdCard';

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
  const { openLoginModal } = useAuthModal();
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
  const [phoneRevealed, setPhoneRevealed] = useState(false);

  // Check if current user is the ad owner
  const isOwner = user?.id === product?.user?.id;

  // Related ads (same category/subcategory, exclude current)
  const { data: relatedData } = useAds(
    { category: categorySlug, subcategory: subcategorySlug, limit: 8 },
    { enabled: !!categorySlug && !!subcategorySlug }
  );
  const relatedAds = (relatedData?.ads || []).filter((ad: any) => ad.id !== product.id).slice(0, 8);

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

  type GalleryImage = { original: string; thumbnail: string };

  const images: GalleryImage[] = validImages.map((img: string) => ({
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
    return `${product.title}${product.price != null ? ` - ₹${Number(product.price).toLocaleString('en-IN')}` : ''}`;
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
      openLoginModal(() => setShowOfferModal(true));
      return;
    }
    setShowOfferModal(true);
  };

  const handleSubmitOffer = async () => {
    if (!offerAmount || parseFloat(offerAmount) <= 0) {
      toast.error('Please enter a valid offer amount');
      return;
    }
    const listPrice = Number(product.price);
    if (Number.isNaN(listPrice) || listPrice <= 0) {
      toast.error('Invalid listing price');
      return;
    }
    const offer = parseFloat(offerAmount);
    if (offer >= listPrice) {
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

  const conditionLabel = product.condition === 'new' ? 'New' : product.condition === 'used' ? 'Used' : product.condition ? String(product.condition) : null;
  const isLikeNew = product.condition === 'new' || (product.condition && String(product.condition).toLowerCase().includes('like new'));
  const postedAgo = product.createdAt ? formatDistanceToNow(new Date(product.createdAt), { addSuffix: true }) : null;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Back link + Breadcrumb */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={`/${categorySlug}/${subcategorySlug}`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600"
        >
          ← Back to {subcategory.name}
        </Link>
        <nav className="text-sm text-gray-600" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href={`/${categorySlug}`} className="hover:text-blue-600">{category.name}</Link>
          <span className="mx-2">/</span>
          <Link href={`/${categorySlug}/${subcategorySlug}`} className="hover:text-blue-600">{subcategory.name}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium truncate max-w-[180px] sm:max-w-none inline-block align-bottom" title={product.title}>{product.title}</span>
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Image gallery */}
            <div className="p-4 sm:p-6">
            <div className="mb-6">
              {activeImage ? (
                <>
                  <div className="relative w-full rounded-xl border border-gray-100/90 shadow-sm bg-gray-50 overflow-hidden">
                    {/* Image counter overlay */}
                    {images.length > 1 && (
                      <span className="absolute top-3 right-3 z-10 rounded-md bg-black/50 px-2 py-1 text-xs font-medium text-white">
                        {activeImageIndex + 1}/{images.length}
                      </span>
                    )}
                    {/* Favorite on image */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (isAuthenticated) toggleFavorite.mutate(product.id);
                        else openLoginModal(() => toggleFavorite.mutate(product.id));
                      }}
                      className="absolute top-3 left-3 z-10 rounded-full bg-white/95 p-2 shadow-sm ring-1 ring-black/5 hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <FiHeart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                    </button>
                    <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
                      <ImageWithFallback
                        src={activeImage}
                        alt={product.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 65vw"
                        priority={activeImageIndex === 0}
                        objectFit="cover"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
                    {previewImages.map((img, index: number) => {
                      const actualIndex = index;
                      const isExtraTile = remainingImageCount > 0 && index === previewImages.length - 1;

                      if (isExtraTile) {
                        return (
                          <button
                            key={`extra-${index}`}
                            onClick={() => setShowAllImages(true)}
                            className="w-20 h-20 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-sm font-semibold text-gray-600 bg-white hover:border-blue-300 hover:text-blue-600 transition-all"
                          >
                            +{remainingImageCount}
                          </button>
                        );
                      }

                      return (
                        <button
                          key={img.original + index}
                          onClick={() => setActiveImageIndex(actualIndex)}
                          className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                            activeImageIndex === actualIndex
                              ? 'border-blue-500 shadow-sm'
                              : 'border-transparent hover:border-gray-200'
                          }`}
                        >
                          <ImageWithFallback
                            src={img.thumbnail}
                            alt={`${product.title} thumbnail ${index + 1}`}
                            width={80}
                            height={80}
                            className="object-cover"
                            priority={false}
                          />
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="w-full aspect-[4/3] bg-gray-200 rounded flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-6xl mb-4 block">📷</span>
                    <p className="text-gray-500">No Images Available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Details & Description - single card (image reference layout) */}
            {(() => {
              const attrs = (product.attributes && typeof product.attributes === 'object' ? product.attributes as Record<string, any> : {}) || {};
              const excludeKeys = ['features', 'highlights'];
              const entries = Object.entries(attrs).filter(([k]) => !excludeKeys.includes(k.toLowerCase()));
              if (product.condition && !attrs.condition) entries.unshift(['condition', product.condition]);
              if (product.brand && !attrs.brand) entries.unshift(['brand', product.brand]);
              const hasDetails = entries.length > 0;
              const hasDescription = product.description && String(product.description).trim();
              if (!hasDetails && !hasDescription) return null;
              return (
            <div className="mt-6 p-6 bg-gray-50/80 rounded-xl border border-gray-100 shadow-sm space-y-6">
              {/* Details section - specs grid */}
              {hasDetails && (() => {
                const formatLabel = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                const getValue = (v: any) => Array.isArray(v) ? v.join(', ') : String(v ?? '');
                return (
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Features & Specifications</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                      {entries.map(([key, value]) => {
                        if (value === null || value === undefined || value === '') return null;
                        const displayValue = getValue(value);
                        if (!displayValue.trim()) return null;
                        return (
                          <div key={key} className="flex flex-col py-1">
                            <span className="text-sm text-gray-600">{formatLabel(key)}</span>
                            <span className="text-base font-bold text-gray-900 mt-0.5">{displayValue}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Description section - main text, Highlights, Reason for selling */}
              {hasDescription && (
                <div className={hasDetails ? 'pt-6 border-t border-gray-200' : ''}>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Description</h2>
                  {(() => {
                    const desc = String(product.description).trim();
                    const highlightsMatch = desc.match(/\b[Hh]ighlights?:\s*([\s\S]*?)(?=\b[Rr]eason\s+for\s+selling:\b|$)/);
                    const reasonMatch = desc.match(/\b[Rr]eason\s+for\s+selling:\s*([\s\S]*?)$/);
                    const mainBefore = desc.split(/\b[Hh]ighlights?:\b/)[0].trim();
                    const mainParagraph = mainBefore || (highlightsMatch ? '' : desc);
                    const highlightsText = highlightsMatch?.[1]?.trim() || '';
                    const bulletPattern = /^[-*•]\s*/;
                    const highlightItems = highlightsText
                      ? highlightsText.split(/\r?\n/).map((l: string) => l.replace(bulletPattern, '').trim()).filter(Boolean)
                      : [];
                    const reasonText = reasonMatch?.[1]?.trim() || '';
                    const featuresFromAttr = (product.attributes as Record<string, any>)?.features;
                    const hasStructured = highlightItems.length > 0 || reasonText || (Array.isArray(featuresFromAttr) && featuresFromAttr.length > 0);
                    const bullets = highlightItems.length > 0 ? highlightItems : (Array.isArray(featuresFromAttr) ? featuresFromAttr : []);
                    return (
                      <div className="space-y-4 text-gray-700">
                        {(mainParagraph || !hasStructured) && (
                          <p className="leading-relaxed whitespace-pre-wrap">
                            {mainParagraph || desc}
                          </p>
                        )}
                        {bullets.length > 0 && (
                          <div>
                            <h3 className="font-bold text-gray-900 mb-2">Highlights:</h3>
                            <ul className="list-none space-y-1">
                              {bullets.map((item: string, i: number) => (
                                <li key={i} className="flex gap-2">
                                  <span className="text-gray-500">-</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {reasonText && (
                          <div>
                            <h3 className="font-bold text-gray-900 mb-2">Reason for selling:</h3>
                            <p className="leading-relaxed">{reasonText}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
              );
            })()}

            {/* Meta: Category, Location, Posted, Views */}
            <div className="border-t border-gray-100 mt-6 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Listing info</h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-gray-500">Category</span>
                  <Link href={`/${categorySlug}`} className="font-medium text-blue-600 hover:underline">
                    {category.name}
                  </Link>
                </div>
                {product.subcategory && (
                  <div className="flex flex-col">
                    <span className="text-gray-500">Subcategory</span>
                    <Link href={`/${categorySlug}/${subcategorySlug}`} className="font-medium text-blue-600 hover:underline">
                      {subcategory.name}
                    </Link>
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-gray-500">Location</span>
                  <span className="font-medium text-gray-900">{product.location?.name || '—'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500">Posted</span>
                  <span className="font-medium text-gray-900">
                    {product.createdAt ? format(new Date(product.createdAt), 'MMM d, yyyy') : '—'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500">Views</span>
                  <span className="font-medium text-gray-900">{product.views ?? 0}</span>
                </div>
              </div>
              {product.id && (
                <p className="mt-3 text-xs text-gray-500">
                  <Link href={`/ads/${product.id}`} className="text-blue-600 hover:underline">
                    View this ad by ID →
                  </Link>
                </p>
              )}
            </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100/90 p-6 sticky top-20 space-y-5">
            {/* Price + Share/Heart */}
            <div className="flex items-start justify-between gap-3">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                ₹{product.price != null ? Number(product.price).toLocaleString('en-IN') : '—'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { if (typeof navigator !== 'undefined' && 'share' in navigator) handleWebShare(); else handleCopyLink(); }}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Share"
                >
                  <FiShare2 className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (isAuthenticated) toggleFavorite.mutate(product.id);
                    else openLoginModal(() => toggleFavorite.mutate(product.id));
                  }}
                  disabled={toggleFavorite.isPending}
                  className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  aria-label={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                >
                  <FiHeart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Product title */}
            <h1 className="text-base font-normal text-gray-900 leading-snug">{product.title}</h1>

            {/* Location + Time */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{product.location?.name || '—'}</span>
              <span>{postedAgo || '—'}</span>
            </div>

            {/* Chat with Seller */}
            {product.user && !isOwner && (
              <Link
                href={`/chat?adId=${product.id}&userId=${product.user.id}`}
                onClick={(e) => {
                  if (!isAuthenticated) {
                    e.preventDefault();
                    openLoginModal(() => { window.location.href = `/chat?adId=${product.id}&userId=${product.user.id}`; });
                  }
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                <FiMessageCircle className="w-5 h-5" /> Chat with Seller
              </Link>
            )}

            {/* Phone */}
            {product.user && !isOwner && (
              product.user.phone && product.user.showPhone !== false ? (
                phoneRevealed ? (
                  <a
                    href={`tel:${product.user.phone}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
                  >
                    <FiPhone className="w-5 h-5 text-blue-600 shrink-0" />
                    <span className="text-base font-semibold text-gray-900">{String(product.user.phone)}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPhoneRevealed(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
                  >
                    <FiPhone className="w-5 h-5 text-blue-600 shrink-0" />
                    <span className="text-base font-semibold text-gray-900">Reveal Phone Number</span>
                  </button>
                )
              ) : product.user.showPhone === false ? (
                <p className="text-sm text-gray-500 py-2">Phone hidden by seller</p>
              ) : (
                <p className="text-sm text-gray-500 py-2">Phone not available</p>
              )
            )}

            {isOwner && (
              <Link
                href={`/edit-ad/${product.id}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
              >
                <FiEdit2 className="w-5 h-5" /> Edit Your Ad
              </Link>
            )}

            {/* Seller card */}
            {product.user ? (
              <div className="pt-4 border-t border-gray-100">
                <Link
                  href={`/user/${product.user.id}`}
                  className="flex items-center gap-3 hover:bg-gray-50 p-2 -m-2 rounded-lg transition-colors"
                >
                  {product.user.avatar ? (
                    <ImageWithFallback
                      src={product.user.avatar}
                      alt={product.user.name || 'Seller'}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0 ring-1 ring-blue-100">
                      <span className="text-lg font-semibold text-blue-700">{(product.user.name || 'S')[0].toUpperCase()}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{product.user.name || 'Unknown Seller'}</p>
                    <p className="text-xs text-gray-500">Seller • View profile</p>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shrink-0">?</div>
                <div>
                  <p className="font-semibold text-gray-900">Seller info unavailable</p>
                  <p className="text-xs text-gray-500">Seller</p>
                </div>
              </div>
            )}

            {/* Safety Tips - card layout */}
            <div className="pt-4 border-t border-gray-100">
              <div className="rounded-xl bg-white border border-gray-100 p-4">
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3">
                  <FiShield className="w-5 h-5 text-blue-600 shrink-0" />
                  Safety Tips
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 leading-relaxed list-disc list-inside">
                  <li>Meet in a safe public place</li>
                  <li>Check the item before you buy</li>
                  <li>Pay only after collecting the item</li>
                  <li>Never pay in advance</li>
                </ul>
              </div>
            </div>

            {/* Compare, Share */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
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
                {isInComparison(product.id) ? 'Remove from Comparison' : 'Add to Comparison'}
              </button>

              {isAuthenticated && product.user && !isOwner && (
                <button
                  onClick={handleMakeOffer}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors font-semibold"
                >
                  <FiDollarSign /> Make Offer
                </button>
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

      {/* Related Items - same card/grid layout as home feed */}
      {relatedAds.length > 0 && (
        <section className="mt-10 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Related Items</h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 items-stretch">
            {relatedAds.map((ad: any, index: number) => (
              <LazyAdCard
                key={ad.id}
                ad={ad}
                variant="ognox"
                priority={index < 2}
                eager={index < 4}
              />
            ))}
          </div>
        </section>
      )}

      {/* Make Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-100/90 max-h-[90vh] overflow-y-auto">
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
              <p className="text-gray-600 mb-4">Listed Price: <span className="font-semibold text-blue-600">₹{Number(product.price).toLocaleString('en-IN')}</span></p>
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
                Enter an amount less than ₹{Number(product.price).toLocaleString('en-IN')}
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
                disabled={isSubmittingOffer || !offerAmount || parseFloat(offerAmount) <= 0 || (product.price != null && parseFloat(offerAmount) >= Number(product.price))}
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
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-100/90">
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

