/**
 * Enhanced Loading Components
 * 
 * Provides various loading states and skeleton screens for better UX
 */

import { type ReactNode } from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  color = 'primary', 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-brand',
    secondary: 'text-secondary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error'
  };

  return (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} ${className}`}>
      <svg 
        className="animate-spin" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: ReactNode;
  className?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  message = 'Loading...', 
  children, 
  className = '' 
}: LoadingOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-md">
          <div className="flex flex-col items-center space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm font-medium text-text-secondary">
              {message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({ 
  width = '100%', 
  height = '1rem', 
  className = '', 
  variant = 'rectangular' 
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-surface-secondary';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  };

  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...(style && { style })}
    />
  );
}

export interface SkeletonTableProps {
  rows: number;
  columns: number;
  className?: string;
}

// Helper function to get grid column class
const getGridColumnsClass = (columns: number): string => {
  const gridMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2', 
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10',
    11: 'grid-cols-11',
    12: 'grid-cols-12'
  };
  return gridMap[Math.min(columns, 12)] || 'grid-cols-12';
};

export function SkeletonTable({ rows, columns, className = '' }: SkeletonTableProps) {
  const gridClass = getGridColumnsClass(columns);
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className={`grid gap-4 ${gridClass}`}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`header-${index}`} height="1.5rem" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={`row-${rowIndex}`} 
          className={`grid gap-4 ${gridClass}`}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              height="1rem"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export interface SkeletonCardProps {
  showAvatar?: boolean;
  lines?: number;
  className?: string;
}

export function SkeletonCard({ 
  showAvatar = false, 
  lines = 3, 
  className = '' 
}: SkeletonCardProps) {
  return (
    <div className={`p-4 border border-border rounded-lg ${className}`}>
      <div className="flex items-start space-x-3">
        {showAvatar && (
          <Skeleton variant="circular" width={40} height={40} />
        )}
        <div className="flex-1 space-y-2">
          <Skeleton height="1.25rem" width="60%" />
          {Array.from({ length: lines }).map((_, index) => (
            <Skeleton 
              key={index} 
              height="1rem" 
              width={index === lines - 1 ? '40%' : '100%'} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export interface ButtonLoadingProps {
  isLoading: boolean;
  children: ReactNode;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function ButtonLoading({ 
  isLoading, 
  children, 
  loadingText, 
  disabled, 
  className = '', 
  onClick,
  type = 'button',
  ...props 
}: ButtonLoadingProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {isLoading && (
        <LoadingSpinner size="sm" className="mr-2" />
      )}
      {isLoading ? (loadingText || 'Loading...') : children}
    </button>
  );
}

export interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showValue?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'error';
}

export function ProgressBar({ 
  value, 
  max = 100, 
  className = '', 
  showValue = false,
  variant = 'primary' 
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const variantClasses = {
    primary: 'bg-brand',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error'
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-1">
        {showValue && (
          <span className="text-sm font-medium text-secondary">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
      <div className="w-full bg-surface-secondary rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ease-out ${variantClasses[variant]}`}
          style={{ '--progress-width': `${percentage}%`, width: 'var(--progress-width)' } as React.CSSProperties}
        />
      </div>
    </div>
  );
}
