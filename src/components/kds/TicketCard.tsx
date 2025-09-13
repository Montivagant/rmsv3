import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import { TicketTimer } from './TicketTimer';
import { Duration } from './utils';

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
  readyAt?: number;
  servedAt?: number;
  preparedBy?: string;
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
  readyAt,
  servedAt,
  preparedBy,
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
    preparing: 'border-warning-200 border-warning-700',
    ready: 'border-success-200 border-success-700',
    served: 'border-border border-border',
  };

  // Stable fallbacks to avoid resetting timers if readyAt/servedAt not yet available
  const readyFallbackRef = useRef<number | undefined>(undefined);
  const servedFallbackRef = useRef<number | undefined>(undefined);

  // When status switches to ready and no readyAt yet, capture a one-time local anchor
  useEffect(() => {
    if (status === 'ready' && !readyAt && !readyFallbackRef.current) {
      readyFallbackRef.current = Date.now();
    }
  }, [status, readyAt]);

  // If a real readyAt arrives later, prefer it
  useEffect(() => {
    if (readyAt) {
      readyFallbackRef.current = readyAt;
    }
  }, [readyAt]);

  // When status switches to served and no servedAt yet, capture local anchor
  useEffect(() => {
    if (status === 'served' && !servedAt && !servedFallbackRef.current) {
      servedFallbackRef.current = Date.now();
    }
  }, [status, servedAt]);

  // Prefer real servedAt when available
  useEffect(() => {
    if (servedAt) {
      servedFallbackRef.current = servedAt;
    }
  }, [servedAt]);

  const displayReadyAt = readyAt ?? readyFallbackRef.current;
  const displayServedAt = servedAt ?? servedFallbackRef.current;

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
            {(() => {
              const started = new Date(timestamp).getTime();
              const mins = Math.floor((Date.now() - started) / 60000);
              return mins >= 12 ? (
                <span
                  className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-error/10 text-error"
                  aria-label="Overdue order"
                >
                  Overdue
                </span>
              ) : null;
            })()}
          </div>
        </div>
        {status === 'preparing' && (
          <TicketTimer 
            startTime={timestamp} 
            className="ml-2"
            showPulse
          />
        )}
        {status === 'ready' && (
          <div className="ml-2 text-sm text-muted-foreground">
            <div>
              Prepared in{' '}
              <Duration from={new Date(timestamp).getTime()} to={displayReadyAt} />
            </div>
            {preparedBy && (
              <div>Prepared by {preparedBy}</div>
            )}
            <div>
              Now ready for{' '}
              {displayReadyAt ? (
                <Duration from={displayReadyAt} />
              ) : (
                <span className="font-mono">00:00</span>
              )}
            </div>
            <div>
              Total{' '}
              <Duration from={new Date(timestamp).getTime()} />
            </div>
          </div>
        )}
        {status === 'served' && (
          <div className="ml-2 text-sm text-muted-foreground">
            <div>
              <Duration from={new Date(timestamp).getTime()} to={displayReadyAt} />
            </div>
            {preparedBy && (
              <div>Prepared by {preparedBy}</div>
            )}
            <div>
              {displayReadyAt && (
                <Duration from={displayReadyAt} to={displayServedAt} />
              )}
            </div>
            <div>
              Served at {displayServedAt ? new Date(displayServedAt).toLocaleTimeString() : '—'}
            </div>
            <div>
              <Duration from={new Date(timestamp).getTime()} to={displayServedAt} />
            </div>
          </div>
        )}
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

