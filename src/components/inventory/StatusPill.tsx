import React from 'react';
import { cn } from '../../lib/utils';

interface StatusPillProps {
  status: 'success' | 'warning' | 'danger' | 'info' | 'default';
  label: string;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

export function StatusPill({
  status,
  label,
  size = 'md',
  dot = true,
  className,
}: StatusPillProps) {
  const statusStyles = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };

  const dotColors = {
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    default: 'bg-gray-500',
  };

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
