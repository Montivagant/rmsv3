import React from 'react';

interface ListItem {
  id: string | number;
  primary: string;
  secondary?: string;
  meta?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  action?: () => void;
}

interface ListCardProps {
  title: string;
  items: ListItem[];
  emptyMessage?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  loading?: boolean;
  maxItems?: number;
  className?: string;
}

export const ListCard: React.FC<ListCardProps> = ({
  title,
  items,
  emptyMessage = 'No items to display',
  action,
  loading = false,
  maxItems = 5,
  className = '',
}) => {
  const displayItems = items.slice(0, maxItems);

  if (loading) {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-surface-secondary rounded w-32"></div>
            {action && <div className="h-4 bg-surface-secondary rounded w-20"></div>}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-surface-secondary rounded w-3/4"></div>
                  <div className="h-3 bg-surface-secondary rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-surface-secondary rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400';
      case 'warning':
        return 'bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-400';
      case 'error':
        return 'bg-error-100 text-error-800 dark:bg-error-900/20 dark:text-error-400';
      case 'info':
        return 'bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-400';
      default:
        return 'bg-surface-secondary text-secondary';
    }
  };

  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary">
          {title}
        </h3>
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium focus-ring rounded px-1"
          >
            {action.label}
          </button>
        )}
      </div>

      {displayItems.length === 0 ? (
        <div className="py-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-tertiary mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm text-secondary">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item, index) => (
            <div
              key={item.id}
              className={`
                flex items-center justify-between py-3
                ${index !== displayItems.length - 1 ? 'border-b border-secondary' : ''}
                ${item.action ? 'cursor-pointer hover:bg-surface-secondary -mx-3 px-3 rounded' : ''}
              `}
              onClick={item.action}
              role={item.action ? 'button' : undefined}
              tabIndex={item.action ? 0 : undefined}
              onKeyDown={(e) => {
                if (item.action && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  item.action();
                }
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary truncate">
                  {item.primary}
                </p>
                {item.secondary && (
                  <p className="text-sm text-secondary truncate">
                    {item.secondary}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {item.status && (
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                )}
                {item.meta && (
                  <span className="text-sm text-secondary whitespace-nowrap">
                    {item.meta}
                  </span>
                )}
                {item.action && (
                  <svg
                    className="w-4 h-4 text-tertiary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > maxItems && (
        <div className="mt-4 pt-4 border-t border-secondary">
          <p className="text-sm text-secondary text-center">
            And {items.length - maxItems} more...
          </p>
        </div>
      )}
    </div>
  );
};

export default ListCard;
