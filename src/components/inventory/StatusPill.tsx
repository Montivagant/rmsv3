import React from 'react';
import { cn } from '../../lib/utils';

interface StatusPillProps {
  status: 'success' | 'warning' | 'danger' | 'info' | 'default';
  label: string;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

export function StatusPillBase({
  status,
  label,
  size = 'md',
  dot = true,
  className,
}: StatusPillProps) {
  // Use semantic design tokens instead of palette colors
  const statusStyles = {
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    danger: 'bg-error/20 text-error',
    info: 'bg-brand/20 text-brand',
    default: 'bg-surface-secondary text-text-secondary',
  } as const;

  const dotColors = {
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-error',
    info: 'bg-brand',
    default: 'bg-border',
  } as const;

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        statusStyles[status],
        sizeStyles[size],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[status])} />
      )}
      {label}
    </span>
  );
}

export const StatusPill = React.memo(StatusPillBase);
