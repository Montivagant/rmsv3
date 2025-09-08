import React from 'react';
import { cn } from '../../lib/utils';

interface StatusColumnProps {
  title: string;
  status: 'preparing' | 'ready' | 'served';
  count: number;
  children: React.ReactNode;
  className?: string;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
}

export function StatusColumn({
  title,
  status,
  count,
  children,
  className,
  onDrop,
  onDragOver,
}: StatusColumnProps) {
  const statusConfig = {
    preparing: {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20',
      countBg: 'bg-warning/20 text-warning',
    },
    ready: {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
      countBg: 'bg-success/20 text-success',
    },
    served: {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M5 13l4 4L19 7" />
        </svg>
      ),
      color: 'text-text-secondary',
      bgColor: 'bg-surface-secondary',
      borderColor: 'border-border',
      countBg: 'bg-surface-secondary text-text-secondary',
    },
  };

  const config = statusConfig[status];
  const hasItems = React.Children.count(children) > 0;

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-lg border-2',
        config.borderColor,
        config.bgColor,
        className
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
      data-status={status}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={config.color}>{config.icon}</span>
            <h3 className="font-semibold text-foreground">{title}</h3>
          </div>
          <span
            className={cn(
              'px-2 py-1 rounded-full text-xs font-bold min-w-[24px] text-center',
              config.countBg
            )}
            aria-label={`${count} orders in ${title}`}
          >
            {count}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {hasItems ? (
          <div className="space-y-3">
            {children}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
            <div className="p-4 rounded-full bg-muted/50 mb-3">
              <svg
                className="w-8 h-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-muted-foreground font-medium">No orders yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Orders will appear here when {status === 'preparing' ? 'received' : `marked as ${status}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
