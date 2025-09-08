import React from 'react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  linkTo?: string;
  linkLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  linkTo,
  linkLabel = 'View details',
  variant = 'default',
  className,
}: KpiCardProps) {
  const variantStyles = {
    default: 'border-border',
    success: 'border-success/20 bg-success/10',
    warning: 'border-warning/20 bg-warning/10',
    danger: 'border-error/20 bg-error/10',
    info: 'border-brand/20 bg-brand/10',
  } as const;

  const iconColors = {
    default: 'text-muted-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-error',
    info: 'text-brand',
  } as const;

  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <svg
                className={cn('w-4 h-4', trend.isPositive ? 'text-success' : 'text-error')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={trend.isPositive ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
                />
              </svg>
              <span className={cn('text-xs font-medium', trend.isPositive ? 'text-success' : 'text-error')}>
                {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('p-2 rounded-lg bg-muted/50', iconColors[variant])}>
            {icon}
          </div>
        )}
      </div>
      {linkTo && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <span className="text-xs text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1">
            {linkLabel}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      )}
    </>
  );

  const cardClasses = cn(
    'bg-card rounded-lg border p-4 transition-all duration-200',
    'hover:shadow-md',
    variantStyles[variant],
    className
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className={cn(cardClasses, 'block hover:no-underline')}>
        {content}
      </Link>
    );
  }

  return <div className={cardClasses}>{content}</div>;
}
