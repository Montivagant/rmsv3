import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 p-3 rounded-full bg-surface-secondary">
          <div className="w-8 h-8 text-tertiary">
            {icon}
          </div>
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-primary mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-tertiary max-w-sm mb-6">
          {description}
        </p>
      )}
      
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'primary'}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
