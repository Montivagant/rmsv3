import React from 'react';
import { cn, formatCurrency } from '../../lib/utils';
import { Modal } from '../../components/Modal';
import { format } from 'date-fns';

export interface HeldOrder {
  id: string;
  ticketId: string;
  customerName?: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  total: number;
  holdTime: Date;
  notes?: string;
}

interface HeldOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldOrders: HeldOrder[];
  onResumeOrder: (order: HeldOrder) => void;
  onDeleteOrder: (orderId: string) => void;
}

export function HeldOrdersModal({
  isOpen,
  onClose,
  heldOrders,
  onResumeOrder,
  onDeleteOrder
}: HeldOrdersModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Held Orders (${heldOrders.length})`} size="xl">
      {heldOrders.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="w-16 h-16 text-muted-foreground mx-auto mb-4"
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
          <p className="text-muted-foreground">No held orders</p>
        </div>
      ) : (
        <div className="grid gap-4 max-h-[60vh] overflow-y-auto">
          {heldOrders.map((order) => (
            <div
              key={order.id}
              className={cn(
                "border border-border rounded-lg p-4",
                "hover:border-primary/50 transition-colors"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">
                    Order #{order.ticketId}
                  </h3>
                  {order.customerName && (
                    <p className="text-sm text-muted-foreground">
                      Customer: {order.customerName}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Held at {format(order.holdTime, 'h:mm a')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    {formatCurrency(order.total)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                  </p>
                </div>
              </div>

              <div className="mb-3 text-sm text-muted-foreground">
                {order.items.slice(0, 2).map((item, index) => (
                  <div key={index}>
                    {item.quantity}x {item.name}
                  </div>
                ))}
                {order.items.length > 2 && (
                  <div>...and {order.items.length - 2} more items</div>
                )}
              </div>

              {order.notes && (
                <div className="mb-3 p-2 bg-surface-secondary rounded text-sm">
                  <span className="font-medium">Notes:</span> {order.notes}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onResumeOrder(order);
                    onClose();
                  }}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg font-medium",
                    "bg-primary text-primary-foreground",
                    "hover:bg-primary/90",
                    "focus:outline-none focus:ring-2 focus:ring-primary",
                    "transition-colors"
                  )}
                >
                  Resume Order
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this held order?')) {
                      onDeleteOrder(order.id);
                    }
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg",
                    "border border-border",
                    "text-muted-foreground hover:text-error",
                    "hover:border-error/50 hover:bg-error/10",
                    "focus:outline-none focus:ring-2 focus:ring-error",
                    "transition-colors"
                  )}
                  aria-label="Delete order"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
