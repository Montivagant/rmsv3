import React from 'react';
import { cn } from '../../lib/utils';
import { TicketTimer } from './TicketTimer';

interface OrderItem {
  id: string;
  name?: string;
  quantity: number;
  modifiers?: string[];
}

interface TicketCardProps {
  orderId: string;
  orderNumber?: string;
  items: OrderItem[];
  status: 'preparing' | 'ready' | 'served';
  timestamp: string;
  tableNumber?: string;
  customerName?: string;
  total?: number;
  density?: 'compact' | 'comfortable';
  onStatusChange?: (newStatus: 'preparing' | 'ready' | 'served') => void;
  onUndo?: () => void;
  isUpdating?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  className?: string;
}

export function TicketCard({
  orderId,
  orderNumber,
  items,
  status,
  timestamp,
  tableNumber,
  customerName,
  total,
  density = 'comfortable',
  onStatusChange,
  onUndo,
  isUpdating = false,
  draggable = false,
  onDragStart,
  onDragEnd,
  className,
}: TicketCardProps) {
  const densityConfig = {
    compact: {
      padding: 'p-3',
      spacing: 'space-y-2',
      fontSize: 'text-sm',
      buttonSize: 'h-9',
      maxItems: 4,
    },
    comfortable: {
      padding: 'p-4',
      spacing: 'space-y-3',
      fontSize: 'text-base',
      buttonSize: 'h-11',
      maxItems: 5,
    },
  };

  const config = densityConfig[density];
  const displayItems = items.slice(0, config.maxItems);
  const remainingCount = Math.max(0, items.length - config.maxItems);

  const nextStatus = {
    preparing: 'ready' as const,
    ready: 'served' as const,
    served: null,
  };

  const actionLabels = {
    preparing: 'Mark Ready',
    ready: 'Mark Served',
    served: 'Completed',
  };

  const statusColors = {
    preparing: 'border-amber-300 dark:border-amber-700',
    ready: 'border-green-300 dark:border-green-700',
    served: 'border-gray-300 dark:border-gray-700',
  };

  return (
    <article
      className={cn(
        'bg-surface rounded-lg border-2 shadow-sm',
        'transition-all duration-200',
        'hover:shadow-md',
        statusColors[status],
        draggable && 'cursor-move',
        config.padding,
        className
      )}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-order-id={orderId}
    >
      {/* Header */}
      <header className={cn('flex items-start justify-between', 'pb-2 border-b border-border/50')}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn('font-bold text-foreground', config.fontSize)}>
              #{orderNumber || orderId}
            </h3>
            {(tableNumber || customerName) && (
              <span className="text-muted-foreground text-sm">
                {tableNumber && `Table ${tableNumber}`}
                {tableNumber && customerName && ' • '}
                {customerName}
              </span>
            )}
          </div>
        </div>
        <TicketTimer 
          startTime={timestamp} 
          className="ml-2"
          showPulse={status === 'preparing'}
        />
      </header>

      {/* Body - Item List */}
      <div className={cn(config.spacing, 'py-2')}>
        {displayItems.map((item, index) => (
          <div key={index} className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('font-medium text-foreground', config.fontSize)}>
                  {item.quantity}x
                </span>
                <span className={cn('text-foreground', config.fontSize)}>
                  {item.name || `Item ${item.id}`}
                </span>
              </div>
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="ml-8 text-sm text-muted-foreground italic">
                  {item.modifiers.join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {remainingCount > 0 && (
          <div className="text-muted-foreground text-sm font-medium pt-1">
            +{remainingCount} more {remainingCount === 1 ? 'item' : 'items'}
          </div>
        )}

        {total !== undefined && density === 'comfortable' && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-semibold text-foreground">
                ${total.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Actions */}
      {onStatusChange && (
        <footer className="pt-2 border-t border-border/50">
          <div className="flex gap-2">
            {nextStatus[status] ? (
              <>
                <button
                  onClick={() => onStatusChange(nextStatus[status]!)}
                  disabled={isUpdating}
                  className={cn(
                    'flex-1 font-medium rounded-lg',
                    'transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    config.buttonSize,
                    isUpdating ? [
                      'bg-muted text-muted-foreground cursor-not-allowed',
                    ] : [
                      'bg-primary text-primary-foreground',
                      'hover:bg-primary/90',
                      'active:scale-[0.98]',
                    ]
                  )}
                  aria-busy={isUpdating}
                >
                  {isUpdating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Updating...
                    </span>
                  ) : (
                    actionLabels[status]
                  )}
                </button>
                {onUndo && status !== 'preparing' && (
                  <button
                    onClick={onUndo}
                    disabled={isUpdating}
                    className={cn(
                      'px-3 font-medium rounded-lg',
                      'border border-border bg-background text-muted-foreground',
                      'transition-all duration-200',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      config.buttonSize
                    )}
                    aria-label="Undo status change"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                )}
              </>
            ) : (
              <div className={cn(
                'flex-1 text-center py-2 px-4 rounded-lg',
                'bg-muted text-muted-foreground font-medium',
                config.buttonSize,
                'flex items-center justify-center'
              )}>
                {actionLabels[status]}
              </div>
            )}
          </div>
        </footer>
      )}
    </article>
  );
}
