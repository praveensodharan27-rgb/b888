'use client';

import FilterCard from './FilterCard';
import { FiZap, FiTruck, FiShield } from 'react-icons/fi';
import { FiX } from 'react-icons/fi';

type Feature = 'emi' | 'delivery' | 'verified';

interface FeatureOption {
  value: Feature;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const FEATURES: FeatureOption[] = [
  { 
    value: 'emi', 
    label: 'EMI Available', 
    icon: <FiZap className="w-5 h-5" />,
    description: 'Easy monthly installments'
  },
  { 
    value: 'delivery', 
    label: 'Delivery Available', 
    icon: <FiTruck className="w-5 h-5" />,
    description: 'Home delivery option'
  },
  { 
    value: 'verified', 
    label: 'Verified Seller', 
    icon: <FiShield className="w-5 h-5" />,
    description: 'Verified and trusted'
  },
];

interface FeaturesFilterCardProps {
  selectedFeatures: Feature[];
  onFeaturesChange: (features: Feature[]) => void;
}

/**
 * Features Filter Card with toggle cards
 */
export default function FeaturesFilterCard({
  selectedFeatures,
  onFeaturesChange,
}: FeaturesFilterCardProps) {
  const handleToggleFeature = (feature: Feature) => {
    if (selectedFeatures.includes(feature)) {
      onFeaturesChange(selectedFeatures.filter(f => f !== feature));
    } else {
      onFeaturesChange([...selectedFeatures, feature]);
    }
  };

  const handleClear = () => {
    onFeaturesChange([]);
  };

  return (
    <FilterCard
      title="Features"
      icon={<FiZap className="w-5 h-5" />}
      selectedCount={selectedFeatures.length}
    >
      <div className="space-y-3">
        {/* Selected Features Display */}
        {selectedFeatures.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-blue-50 rounded-lg">
            {selectedFeatures.map((feature) => {
              const featureData = FEATURES.find(f => f.value === feature);
              return (
                <span
                  key={feature}
                  className="inline-flex items-center gap-1 px-2 py-1 
                           bg-blue-100 text-blue-700 rounded-full text-xs"
                >
                  {featureData?.label}
                  <button
                    onClick={() => handleToggleFeature(feature)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                    aria-label={`Remove ${featureData?.label}`}
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            <button
              onClick={handleClear}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Feature Toggle Cards */}
        <div className="space-y-2">
          {FEATURES.map((feature) => {
            const isSelected = selectedFeatures.includes(feature.value);
            return (
              <button
                key={feature.value}
                onClick={() => handleToggleFeature(feature.value)}
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
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                      {feature.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {feature.description}
                    </div>
                  </div>
                  <div className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center
                    transition-all duration-200
                    ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'bg-white border-gray-300'
                    }
                  `}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </FilterCard>
  );
}
