'use client';

import { ComponentType, ReactNode, Suspense, lazy, Component } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class DynamicImportErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Dynamic import error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }

    return this.props.children;
  }
}

/**
 * Safely load a dynamic component with error handling
 */
export function safeDynamicImport<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: {
    loading?: () => ReactNode;
    fallback?: ReactNode;
    ssr?: boolean;
  }
) {
  const LazyComponent = lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      console.error('Failed to load dynamic component:', error);
      // Return a fallback component
      const FallbackComponent = (() => options?.fallback || null) as unknown as T;
      return {
        default: FallbackComponent,
      } as { default: T };
    }
  });

  return (props: any) => (
    <DynamicImportErrorBoundary fallback={options?.fallback}>
      <Suspense fallback={options?.loading?.() || null}>
        <LazyComponent {...props} />
      </Suspense>
    </DynamicImportErrorBoundary>
  );
}

