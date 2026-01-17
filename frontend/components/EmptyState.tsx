'use client';

import { FiSearch, FiInbox, FiFilter } from 'react-icons/fi';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: 'search' | 'inbox' | 'filter';
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  title = 'No ads found',
  message = 'No ads found for this category',
  icon = 'search',
  actionLabel,
  onAction,
  className = ''
}: EmptyStateProps) {
  const getIcon = () => {
    switch (icon) {
      case 'inbox':
        return <FiInbox className="w-16 h-16 text-gray-400" />;
      case 'filter':
        return <FiFilter className="w-16 h-16 text-gray-400" />;
      default:
        return <FiSearch className="w-16 h-16 text-gray-400" />;
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      <div className="mb-6">
        {getIcon()}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 text-center max-w-md mb-6">
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

