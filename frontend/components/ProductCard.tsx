'use client';

import { useState } from 'react';
import { FiHeart } from 'react-icons/fi';
import ImageWithFallback from './ImageWithFallback';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    description?: string;
    image: string;
    colors?: string[];
    sizes?: string[];
  };
  onWishlistToggle?: (productId: string) => void;
  isWishlisted?: boolean;
  onAddToCart?: (productId: string, color?: string | null, size?: string | null) => void;
}

export default function ProductCard({
  product,
  onWishlistToggle,
  isWishlisted = false,
  onAddToCart,
}: ProductCardProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(
    product.colors?.[0] || null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(
    product.sizes?.[0] || null
  );

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onWishlistToggle) {
      onWishlistToggle(product.id);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product.id, selectedColor, selectedSize);
    }
  };

  // Helper function to convert color name to hex (basic mapping)
  const getColorHex = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      black: '#000000',
      white: '#FFFFFF',
      red: '#EF4444',
      blue: '#3B82F6',
      green: '#10B981',
      yellow: '#F59E0B',
      pink: '#EC4899',
      purple: '#8B5CF6',
      gray: '#6B7280',
      grey: '#6B7280',
      brown: '#92400E',
      navy: '#1E3A8A',
      beige: '#F5F5DC',
      orange: '#F97316',
    };
    return colorMap[colorName.toLowerCase()] || '#CCCCCC';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col">
      {/* Product Image with Wishlist Icon */}
      <div className="relative w-full h-64 bg-gray-100 overflow-hidden">
        <ImageWithFallback
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
        />
        {/* Wishlist Icon - Top Right */}
        <button
          onClick={handleWishlistClick}
          className={`absolute top-3 right-3 p-2.5 rounded-full backdrop-blur-sm transition-all shadow-md z-10 ${
            isWishlisted
              ? 'bg-red-500 text-white'
              : 'bg-white/90 text-gray-600 hover:bg-red-500 hover:text-white'
          }`}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <FiHeart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Product Info */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Product Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {product.name}
        </h3>

        {/* Price */}
        <div className="mb-3">
          {product.originalPrice && product.originalPrice > product.price ? (
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-gray-900">
                ₹{product.price.toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-gray-500 line-through">
                ₹{product.originalPrice.toLocaleString('en-IN')}
              </p>
            </div>
          ) : (
            <p className="text-xl font-bold text-gray-900">
              ₹{product.price.toLocaleString('en-IN')}
            </p>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Color Swatches */}
        {product.colors && product.colors.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">Color</p>
            <div className="flex gap-2 flex-wrap">
              {product.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color
                      ? 'border-gray-900 scale-110 shadow-md'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{
                    backgroundColor: getColorHex(color),
                  }}
                  aria-label={`Select color ${color}`}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}

        {/* Size Options */}
        {product.sizes && product.sizes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">Size</p>
            <div className="flex gap-2 flex-wrap">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                    selectedSize === size
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                  aria-label={`Select size ${size}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors mt-auto"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}

