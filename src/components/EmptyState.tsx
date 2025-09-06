import { forwardRef, type ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  className?: string;
}

const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('empty-state', className)}
        {...props}
      >
        {icon && (
          <div className="empty-state-icon">
            {icon}
          </div>
        )}
        
        <div className="empty-state-content">
          <h3 className="empty-state-title">
            {title}
          </h3>
          
          {description && (
            <p className="empty-state-description">
              {description}
            </p>
          )}
        </div>

        {action && (
          <div className="empty-state-action">
            <Button
              variant={action.variant || 'primary'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          </div>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

export { EmptyState };
