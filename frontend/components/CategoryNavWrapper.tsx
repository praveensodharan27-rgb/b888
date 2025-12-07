'use client';

import { Component, ReactNode } from 'react';
import dynamic from 'next/dynamic';

const CategoryNav = dynamic(() => import('@/components/CategoryNav'), {
  loading: () => <div className="h-14 bg-white border-b border-gray-200"></div>,
  ssr: false
});

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class CategoryNavWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('CategoryNav error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null; // Silently fail - don't break the page
    }

    return <CategoryNav />;
  }
}

