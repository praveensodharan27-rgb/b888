'use client';

import FilterCard from './FilterCard';
import { FiClock } from 'react-icons/fi';
import { FiX } from 'react-icons/fi';

type PostedTime = 'today' | '3d' | '7d' | '30d';

interface PostedTimeOption {
  value: PostedTime;
  label: string;
  days: number;
}

const POSTED_TIME_OPTIONS: PostedTimeOption[] = [
  { value: 'today', label: 'Today', days: 0 },
  { value: '3d', label: 'Last 3 days', days: 3 },
  { value: '7d', label: 'Last 7 days', days: 7 },
  { value: '30d', label: 'Last 30 days', days: 30 },
];

interface PostedTimeFilterCardProps {
  selectedPostedTime?: PostedTime;
  onPostedTimeChange: (postedTime: PostedTime | null) => void;
}

/**
 * Posted Time Filter Card with time period buttons
 */
export default function PostedTimeFilterCard({
  selectedPostedTime,
  onPostedTimeChange,
}: PostedTimeFilterCardProps) {
  const selectedOption = POSTED_TIME_OPTIONS.find(opt => opt.value === selectedPostedTime);

  const handleClear = () => {
    onPostedTimeChange(null);
  };

  return (
    <FilterCard
      title="Posted Time"
      icon={<FiClock className="w-5 h-5" />}
      selectedLabel={selectedOption?.label}
      selectedCount={selectedPostedTime ? 1 : 0}
    >
      <div className="space-y-3">
        {/* Selected Time Display */}
        {selectedPostedTime && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700 flex-1">
              {selectedOption?.label}
            </span>
            <button
              onClick={handleClear}
              className="p-1 hover:bg-blue-100 rounded-full transition-colors"
              aria-label="Clear posted time"
            >
              <FiX className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        )}

        {/* Time Period Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {POSTED_TIME_OPTIONS.map((option) => {
            const isSelected = selectedPostedTime === option.value;
            return (
              <button
                key={option.value}
                onClick={() => {
                  if (isSelected) {
                    onPostedTimeChange(null);
                  } else {
                    onPostedTimeChange(option.value);
                  }
                }}
                className={`
                  px-4 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </FilterCard>
  );
}
