/**
 * ResponsiveContainer - Reusable container component for consistent responsive layout
 * 
 * Usage:
 * <ResponsiveContainer> - Standard content container (1400px)
 * <ResponsiveContainer size="narrow"> - Narrower container for forms/articles
 * <ResponsiveContainer size="standard"> - Standard 1280px width
 * <ResponsiveContainer size="full"> - Full width with padding
 * <ResponsiveContainer noPadding> - Remove horizontal padding
 */

import { ReactNode } from 'react';

interface ResponsiveContainerProps {
  children: ReactNode;
  size?: 'narrow' | 'default' | 'standard' | 'full';
  noPadding?: boolean;
  className?: string;
  as?: 'div' | 'section' | 'main' | 'article' | 'aside';
}

const sizeClasses = {
  narrow: 'max-w-3xl',      // 768px - forms, articles
  default: 'max-w-[1400px]', // 1400px - standard content (NEW DEFAULT)
  standard: 'max-w-7xl',     // 1280px - legacy standard
  full: 'max-w-full',        // Full width
};

export default function ResponsiveContainer({
  children,
  size = 'default',
  noPadding = false,
  className = '',
  as: Component = 'div',
}: ResponsiveContainerProps) {
  const paddingClasses = noPadding ? '' : 'px-4 sm:px-6 lg:px-8';
  
  return (
    <Component 
      className={`${sizeClasses[size]} mx-auto w-full ${paddingClasses} ${className}`}
    >
      {children}
    </Component>
  );
}
