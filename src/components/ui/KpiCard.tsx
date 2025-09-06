import React from 'react';
import { cn } from '../../lib/utils';
import { Skeleton } from './Loading';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  sparkline?: number[];
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  loading?: boolean;
  className?: string;
}

/**
 * Enhanced KPI Card component with sparkline support
 * Uses design tokens for theming and supports loading states
 */
export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  sparkline,
  icon,
  action,
  loading = false,
  className
}: KpiCardProps) {
  if (loading) {
    return (
      <div className={cn('bg-surface border border-border-primary rounded-lg p-6', className)}>
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          {icon && <Skeleton className="w-12 h-12 rounded-lg" />}
        </div>
        {subtitle && <Skeleton className="h-3 w-40 mb-2" />}
        {trend && <Skeleton className="h-3 w-20 mb-2" />}
        {sparkline && <Skeleton className="h-8 w-full mb-2" />}
        {action && <Skeleton className="h-4 w-24" />}
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-surface border border-border-primary rounded-lg p-6 hover:shadow-md transition-shadow duration-200',
      className
    )}>
      {/* Header with title, value, and optional icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-text-secondary mb-1">
            {title}
          </h3>
          <p className="text-2xl font-bold text-text-primary">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        {icon && (
          <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/20 rounded-lg flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0 ml-4">
            {icon}
          </div>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-text-secondary mb-3">
          {subtitle}
        </p>
      )}

      {/* Trend indicator */}
      {trend && (
        <div className="flex items-center space-x-1 mb-3">
          <svg
            className={cn(
              'w-4 h-4',
              trend.isPositive ? 'text-success-600' : 'text-error-600'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={trend.isPositive 
                ? 'M5 10l7-7m0 0l7 7m-7-7v18' 
                : 'M19 14l-7 7m0 0l-7-7m7 7V3'
              }
            />
          </svg>
          <span
            className={cn(
              'text-sm font-medium',
              trend.isPositive ? 'text-success-600' : 'text-error-600'
            )}
          >
            {Math.abs(trend.value).toFixed(1)}%
          </span>
          <span className="text-sm text-text-tertiary">
            vs last period
          </span>
        </div>
      )}

      {/* Sparkline chart */}
      {sparkline && sparkline.length > 0 && (
        <div className="mb-3">
          <SparklineChart data={sparkline} />
        </div>
      )}

      {/* Action link */}
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 rounded px-1 -ml-1"
        >
          {action.label} →
        </button>
      )}
    </div>
  );
}

/**
 * Simple SVG-based sparkline chart component
 * Uses design tokens for consistent theming
 */
function SparklineChart({ data }: { data: number[] }) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  // Avoid division by zero
  if (range === 0) return null;

  const width = 120;
  const height = 32;
  const padding = 2;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * (width - 2 * padding) + padding;
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex items-center justify-center">
      <svg 
        width={width} 
        height={height} 
        className="text-brand-500"
        viewBox={`0 0 ${width} ${height}`}
        aria-label="Trend sparkline chart"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="drop-shadow-sm"
        />
        {/* Optional: Add fill area */}
        <polyline
          fill="currentColor"
          stroke="none"
          opacity="0.1"
          points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
        />
      </svg>
    </div>
  );
}

export default KpiCard;
