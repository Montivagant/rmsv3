import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  loading?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  action,
  loading = false,
  className = '',
}) => {
  if (loading) {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-2">
              <div className="h-4 bg-surface-secondary rounded w-24"></div>
              <div className="h-8 bg-surface-secondary rounded w-32"></div>
            </div>
            {icon && <div className="w-12 h-12 bg-surface-secondary rounded-lg"></div>}
          </div>
          {subtitle && <div className="h-3 bg-surface-secondary rounded w-40 mt-2"></div>}
          {trend && <div className="h-3 bg-surface-secondary rounded w-20 mt-2"></div>}
        </div>
      </div>
    );
  }

  return (
    <div className={`card p-6 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-secondary mb-1">
            {title}
          </h3>
          <p className="text-2xl font-bold text-primary">
            {value}
          </p>
        </div>
        {icon && (
          <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-center text-primary-600 dark:text-primary-400">
            {icon}
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-sm text-secondary mb-2">
          {subtitle}
        </p>
      )}

      {trend && (
        <div className="flex items-center space-x-1 mb-3">
          <svg
            className={`w-4 h-4 ${
              trend.isPositive ? 'text-success-600' : 'text-error-600'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={trend.isPositive ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'}
            />
          </svg>
          <span
            className={`text-sm font-medium ${
              trend.isPositive ? 'text-success-600' : 'text-error-600'
            }`}
          >
            {Math.abs(trend.value)}%
          </span>
          <span className="text-sm text-tertiary">
            vs last period
          </span>
        </div>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium focus-ring rounded px-1 -ml-1"
        >
          {action.label} →
        </button>
      )}
    </div>
  );
};

export default StatCard;
