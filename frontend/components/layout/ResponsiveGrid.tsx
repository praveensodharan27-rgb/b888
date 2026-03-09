/**
 * ResponsiveGrid - Reusable grid component for cards and content
 * 
 * Usage:
 * <ResponsiveGrid cols="cards"> - Product/Ad cards (1-2-3-4-5 columns)
 * <ResponsiveGrid cols="content"> - Content cards (1-2-3 columns)
 * <ResponsiveGrid cols="features"> - Feature boxes (1-2-4 columns)
 */

import { ReactNode } from 'react';

interface ResponsiveGridProps {
  children: ReactNode;
  cols?: 'cards' | 'content' | 'features' | 'list';
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colsClasses = {
  cards: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  content: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  features: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  list: 'grid-cols-1',
};

const gapClasses = {
  sm: 'gap-3',
  md: 'gap-4 sm:gap-5',
  lg: 'gap-4 sm:gap-6 lg:gap-8',
};

export default function ResponsiveGrid({
  children,
  cols = 'cards',
  gap = 'md',
  className = '',
}: ResponsiveGridProps) {
  return (
    <div className={`grid ${colsClasses[cols]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}
