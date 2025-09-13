import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      if (this.props.onError) {
        this.props.onError(error, info);
      } else {
        // Minimal console logging to avoid noisy tests; gate behind env var if needed
        if ((import.meta as any).env?.MODE !== 'test') {
          // eslint-disable-next-line no-console
          console.error('[ErrorBoundary]', error, info);
        }
      }
    } catch {
      // no-op
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div role="alert" className="min-h-[10rem] p-6 bg-surface rounded-lg border border-border text-text-primary">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-text-secondary">An unexpected error occurred. Please try again or contact support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
