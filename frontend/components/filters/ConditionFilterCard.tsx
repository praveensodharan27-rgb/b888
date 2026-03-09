'use client';

import FilterCard from './FilterCard';
import { FiCheckCircle, FiX } from 'react-icons/fi';

type Condition = 'NEW' | 'LIKE_NEW' | 'USED' | 'REFURBISHED';

interface ConditionOption {
  value: Condition;
  label: string;
  description: string;
}

const CONDITIONS: ConditionOption[] = [
  { value: 'NEW', label: 'New', description: 'Brand new, unused' },
  { value: 'LIKE_NEW', label: 'Like New', description: 'Minimal wear' },
  { value: 'USED', label: 'Used', description: 'Good condition' },
  { value: 'REFURBISHED', label: 'Refurbished', description: 'Restored to working condition' },
];

interface ConditionFilterCardProps {
  selectedCondition?: Condition;
  onConditionChange?: (condition: Condition | null) => void;
}

export default function ConditionFilterCard({
  selectedCondition,
  onConditionChange,
}: ConditionFilterCardProps) {
  const selectedOption = CONDITIONS.find(opt => opt.value === selectedCondition);

  const handleClear = () => {
    onConditionChange?.(null);
  };

  return (
    <FilterCard
      title="CONDITION"
      icon={<FiCheckCircle className="w-4 h-4" />}
      selectedLabel={selectedOption?.label}
      selectedCount={selectedCondition ? 1 : 0}
    >
      <div className="space-y-3">
        {/* Selected Condition Display */}
        {selectedCondition && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700 flex-1 font-medium">
              {selectedOption?.label}
            </span>
            <button
              onClick={handleClear}
              className="p-1 hover:bg-blue-100 rounded-full transition-colors"
              aria-label="Clear condition"
            >
              <FiX className="w-4 h-4 text-blue-600" />
            </button>
          </div>
        )}

        {/* Condition Options */}
        <div className="grid grid-cols-2 gap-2">
          {CONDITIONS.map((condition) => {
            const isSelected = selectedCondition === condition.value;
            return (
              <button
                key={condition.value}
                onClick={() => {
                  if (isSelected) {
                    onConditionChange?.(null);
                  } else {
                    onConditionChange?.(condition.value);
                  }
                }}
                className={`
                  px-4 py-3 rounded-lg text-sm font-semibold
                  transition-all duration-200 text-left
                  ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <div className="font-semibold">{condition.label}</div>
                <div className={`text-xs mt-0.5 ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                  {condition.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </FilterCard>
  );
}
