import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'rectangular', width, height, lines, ...props }, ref) => {
    const variantClasses = {
      text: 'skeleton-text',
      circular: 'skeleton-circular',
      rectangular: 'skeleton-rectangular',
      rounded: 'skeleton-rounded',
    };

    const style = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
    };

    // For multiple lines of text
    if (lines && lines > 1) {
      return (
        <div className="space-y-2" ref={ref} {...props}>
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className={cn(
                'skeleton-base',
                variantClasses.text,
                index === lines - 1 && 'w-3/4', // Last line is shorter
                className
              )}
              style={index === lines - 1 ? { ...style, width: '75%' } : style}
            />
          ))}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'skeleton-base',
          variantClasses[variant],
          className
        )}
        style={style}
        data-testid="skeleton"
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Predefined skeleton components for common use cases
const SkeletonCard = forwardRef<HTMLDivElement, { showAvatar?: boolean; lines?: number; className?: string }>(
  ({ showAvatar = true, lines = 3, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('card p-4 space-y-3', className)}
        {...props}
      >
        {showAvatar && (
          <div className="flex items-center space-x-3">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="space-y-2 flex-1">
              <Skeleton variant="text" height={16} width="60%" />
              <Skeleton variant="text" height={14} width="40%" />
            </div>
          </div>
        )}
        <Skeleton lines={lines} />
      </div>
    );
  }
);

const SkeletonTable = forwardRef<HTMLDivElement, { rows?: number; columns?: number; className?: string }>(
  ({ rows = 5, columns = 4, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('space-y-3', className)}
        {...props}
      >
        {/* Header */}
        <div className="grid gap-4 grid-cols-var" style={{ ['--grid-template' as any]: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={`header-${index}`} height={20} />
          ))}
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="grid gap-4 grid-cols-var"
            style={{ ['--grid-template' as any]: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={`cell-${rowIndex}-${colIndex}`} height={16} />
            ))}
          </div>
        ))}
      </div>
    );
  }
);

SkeletonCard.displayName = 'SkeletonCard';
SkeletonTable.displayName = 'SkeletonTable';

export { Skeleton, SkeletonCard, SkeletonTable };
