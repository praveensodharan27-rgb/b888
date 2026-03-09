'use client';

import FilterCard from './FilterCard';
import { FiUser, FiBriefcase, FiCheckCircle, FiX } from 'react-icons/fi';

type SellerType = 'individual' | 'business' | 'verified';

interface SellerTypeOption {
  value: SellerType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const SELLER_TYPES: SellerTypeOption[] = [
  { 
    value: 'individual', 
    label: 'Individual', 
    icon: <FiUser className="w-5 h-5" />,
    description: 'Private sellers'
  },
  { 
    value: 'business', 
    label: 'Business', 
    icon: <FiBriefcase className="w-5 h-5" />,
    description: 'Commercial sellers'
  },
  { 
    value: 'verified', 
    label: 'Verified', 
    icon: <FiCheckCircle className="w-5 h-5" />,
    description: 'Verified sellers only'
  },
];

interface SellerTypeFilterCardProps {
  selectedSellerType?: SellerType;
  onSellerTypeChange: (sellerType: SellerType | null) => void;
}

/**
 * Seller Type Filter Card with radio card style selection
 */
export default function SellerTypeFilterCard({
  selectedSellerType,
  onSellerTypeChange,
}: SellerTypeFilterCardProps) {
  const selectedOption = SELLER_TYPES.find(opt => opt.value === selectedSellerType);

  const handleClear = () => {
    onSellerTypeChange(null);
  };

  return (
    <FilterCard
      title="Seller Type"
      icon={<FiUser className="w-5 h-5" />}
      selectedLabel={selectedOption?.label}
      selectedCount={selectedSellerType ? 1 : 0}
    >
      <div className="space-y-3">
        {/* Selected Type Display */}
        {selectedSellerType && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700 flex-1">
              {selectedOption?.label}
            </span>
            <button
              onClick={handleClear}
              className="p-1 hover:bg-blue-100 rounded-full transition-colors"
              aria-label="Clear seller type"
            >
              <FiX className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        )}

        {/* Seller Type Cards */}
        <div className="space-y-2">
          {SELLER_TYPES.map((option) => {
            const isSelected = selectedSellerType === option.value;
            return (
              <button
                key={option.value}
                onClick={() => {
                  if (isSelected) {
                    onSellerTypeChange(null);
                  } else {
                    onSellerTypeChange(option.value);
                  }
                }}
                className={`
                  w-full p-3 rounded-xl border-2 transition-all duration-200
                  text-left
                  ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    p-2 rounded-lg
                    ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                  `}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {option.description}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </FilterCard>
  );
}
