'use client';

import { useState } from 'react';
import FilterCard from './FilterCard';
import { FiStar } from 'react-icons/fi';
import { FiX } from 'react-icons/fi';

interface RatingFilterCardProps {
  selectedRating?: number;
  onRatingChange: (rating: number | null) => void;
}

/**
 * Rating Filter Card with star selection
 */
export default function RatingFilterCard({
  selectedRating,
  onRatingChange,
}: RatingFilterCardProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const handleClear = () => {
    onRatingChange(null);
  };

  const displayRating = hoveredRating || selectedRating || 0;

  return (
    <FilterCard
      title="Rating"
      icon={<FiStar className="w-5 h-5" />}
      selectedLabel={selectedRating ? `${selectedRating}+ stars` : undefined}
      selectedCount={selectedRating ? 1 : 0}
    >
      <div className="space-y-3">
        {/* Selected Rating Display */}
        {selectedRating && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700 flex-1">
              {selectedRating}+ stars
            </span>
            <button
              onClick={handleClear}
              className="p-1 hover:bg-blue-100 rounded-full transition-colors"
              aria-label="Clear rating"
            >
              <FiX className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        )}

        {/* Star Selection */}
        <div className="flex items-center gap-2 justify-center py-2">
          {[1, 2, 3, 4, 5].map((rating) => {
            const isActive = displayRating >= rating;
            const isSelected = selectedRating ? selectedRating >= rating : false;
            
            return (
              <button
                key={rating}
                onClick={() => {
                  if (selectedRating === rating) {
                    onRatingChange(null);
                  } else {
                    onRatingChange(rating);
                  }
                }}
                onMouseEnter={() => setHoveredRating(rating)}
                onMouseLeave={() => setHoveredRating(null)}
                className={`
                  transition-all duration-200 transform hover:scale-110
                  ${isActive ? 'text-yellow-400' : 'text-gray-300'}
                `}
                aria-label={`${rating} stars and above`}
              >
                <FiStar
                  className={`
                    w-8 h-8
                    ${isSelected ? 'fill-yellow-400' : ''}
                    ${isActive && !isSelected ? 'fill-yellow-300' : ''}
                  `}
                />
              </button>
            );
          })}
        </div>

        {/* Rating Label */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {displayRating > 0 
              ? `Show ads with ${displayRating}+ stars rating`
              : 'Select minimum rating'
            }
          </p>
        </div>
      </div>
    </FilterCard>
  );
}
