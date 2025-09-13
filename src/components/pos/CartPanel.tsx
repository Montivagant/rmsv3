import React, { useState } from 'react';
import { cn, formatCurrency, truncate } from '../../lib/utils';
import { QtyStepper } from './QtyStepper';
import { CustomerAutoComplete, type Customer } from '../ui/AutoComplete';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

interface CartTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

interface CartPanelProps {
  items: CartItem[];
  totals: CartTotals;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onPlaceOrder: () => void;
  onClearCart: () => void;
  isProcessing?: boolean;
  discount?: number;
  onDiscountChange?: (discount: number) => void;
  selectedCustomer?: Customer | null;
  onCustomerChange?: (customer: Customer | null) => void;
  searchCustomers?: (query: string) => Promise<Customer[]>;
  orderNotes?: string;
  onOrderNotesChange?: (notes: string) => void;
  className?: string;
  onVoidOrder?: () => void;
  onReturnItems?: () => void;
}

export function CartPanel({
  items,
  totals,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
  onClearCart,
  isProcessing = false,
  discount = 0,
  onDiscountChange,
  selectedCustomer,
  onCustomerChange,
  searchCustomers,
  orderNotes = '',
  onOrderNotesChange,
  className,
  onVoidOrder,
  onReturnItems,
}: CartPanelProps) {
  const isEmpty = items.length === 0;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const [showNotesField, setShowNotesField] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-full",
        "bg-surface rounded-lg border border-border",
        className
      )}
      aria-label="Shopping cart"
    >
      {/* Header */}
      <header className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">
            Current Order
          </h2>
          {!isEmpty && (
            <span className="px-2 py-1 text-sm font-medium bg-primary/10 text-primary rounded-md">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
      </header>

      {/* Customer Selection and Order Options */}
      {!isEmpty && (searchCustomers || onOrderNotesChange) && (
        <div className="px-6 py-4 border-b border-border space-y-4">
          {/* Customer Selection */}
          {searchCustomers && onCustomerChange && (
            <div>
              <CustomerAutoComplete
                name="customer"
                label="Customer (Optional)"
                value={selectedCustomer?.id || ''}
                onChange={(value, customer) => onCustomerChange(customer || null)}
                searchCustomers={searchCustomers}
                placeholder="Search for customer..."
                helpText={null}
                className="w-full"
              />
              {selectedCustomer && (
                <div className="mt-2 p-2 bg-accent/10 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                      {selectedCustomer.loyaltyPoints > 0 && (
                        <p className="text-muted-foreground">Points: {selectedCustomer.loyaltyPoints}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onCustomerChange(null)}
                      className="text-sm text-muted-foreground hover:text-destructive"
                      aria-label="Remove customer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Order Notes */}
          {onOrderNotesChange && (
            <div>
              <button
                onClick={() => setShowNotesField(!showNotesField)}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  "text-muted-foreground hover:text-foreground",
                  "transition-colors"
                )}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {showNotesField ? 'Hide Notes' : 'Add Notes'}
                {orderNotes && !showNotesField && (
                  <span className="text-primary">•</span>
                )}
              </button>
              {showNotesField && (
                <textarea
                  value={orderNotes}
                  onChange={(e) => onOrderNotesChange(e.target.value)}
                  placeholder="Special instructions, dietary requirements, etc."
                  className={cn(
                    "mt-2 w-full px-3 py-2",
                    "rounded-md border border-border",
                    "bg-background text-foreground",
                    "placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary",
                    "resize-none"
                  )}
                  rows={3}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <svg
              className="w-16 h-16 text-muted-foreground mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <p className="text-muted-foreground font-medium">Your cart is empty</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add items to get started
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.id}
                className="p-4 hover:bg-accent/5 transition-colors"
              >
                <div className="space-y-3">
                  {/* Item name and price */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground">
                        {truncate(item.name, 40)}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className={cn(
                        "p-1.5 rounded-md",
                        "text-muted-foreground hover:text-destructive",
                        "hover:bg-destructive/10",
                        "focus:outline-none focus:ring-2 focus:ring-destructive",
                        "transition-all duration-200"
                      )}
                      aria-label={`Remove ${item.name} from cart`}
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

                  {/* Quantity and subtotal */}
                  <div className="flex items-center justify-between">
                    <QtyStepper
                      value={item.quantity}
                      onChange={(qty) => onUpdateQuantity(item.id, qty)}
                      min={1}
                      size="sm"
                    />
                    <span className="font-semibold text-foreground">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Totals and Actions */}
      {!isEmpty && (
        <div className="border-t border-border">
          {/* Totals */}
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
            </div>

            {/* Discount Input */}
            {onDiscountChange && (
              <div className="flex justify-between items-center text-sm">
                <label htmlFor="discount" className="text-muted-foreground">
                  Discount
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="discount"
                    type="number"
                    value={discount}
                    onChange={(e) => onDiscountChange(Math.max(0, parseFloat(e.target.value) || 0))}
                    className={cn(
                      "w-24 px-2 py-1 text-right",
                      "rounded-md border border-border",
                      "bg-background text-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-primary",
                      "transition-all duration-200"
                    )}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                  {totals.discount > 0 && (
                    <span className="text-destructive font-medium">
                      -{formatCurrency(totals.discount)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {totals.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-medium">{formatCurrency(totals.tax)}</span>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(totals.total)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 pt-0 space-y-2">
            <button
              onClick={onPlaceOrder}
              disabled={isProcessing}
              className={cn(
                "w-full py-3 px-4 min-h-[48px]",
                "rounded-lg font-semibold text-base",
                "transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                // Enabled state
                !isProcessing && [
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90",
                  "active:scale-[0.98]",
                ],
                // Processing state
                isProcessing && [
                  "bg-primary/50 text-primary-foreground/70",
                  "cursor-not-allowed",
                ]
              )}
              aria-busy={isProcessing}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                'Place Order'
              )}
            </button>

            {/* Void / Return actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onVoidOrder}
                disabled={!onVoidOrder}
                className={cn(
                  "w-full py-2 px-4",
                  "rounded-lg font-medium",
                  "border border-border",
                  "bg-background text-muted-foreground",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "transition-all duration-200",
                  !onVoidOrder && 'opacity-50 cursor-not-allowed'
                )}
                aria-disabled={!onVoidOrder}
              >
                Void
              </button>
              <button
                onClick={onReturnItems}
                disabled={!onReturnItems}
                className={cn(
                  "w-full py-2 px-4",
                  "rounded-lg font-medium",
                  "border border-border",
                  "bg-background text-muted-foreground",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "transition-all duration-200",
                  !onReturnItems && 'opacity-50 cursor-not-allowed'
                )}
                aria-disabled={!onReturnItems}
              >
                Return
              </button>
            </div>

            <button
              onClick={onClearCart}
              className={cn(
                "w-full py-2 px-4",
                "rounded-lg font-medium",
                "border border-border",
                "bg-background text-muted-foreground",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "transition-all duration-200"
              )}
            >
              Clear Cart
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
