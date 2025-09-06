import { useState, useEffect, useRef, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { computeTotals, type Line } from '../money/totals';
import { useEventStore } from '../events/context';
import { getRole, RANK, Role } from '../rbac/roles';
import { inventoryEngine } from '../inventory/engine';
import { getOversellPolicy } from '../inventory/policy';
import { OversellError } from '../inventory/types';
import { useToast } from '../components/Toast';
import { pointsToValue, DEFAULT_LOYALTY_CONFIG } from '../loyalty/rules';
import { useFlags } from '../store/flags';
import { createPaymentProvider, type PlaceholderPaymentProvider } from '../payments/provider';
import { generatePaymentKeys, handleWebhook } from '../payments/webhook';
import { derivePaymentStatus } from '../payments/status';
import { PaymentModal } from '../components/PaymentModal';
import { createTaxService, type TaxCalculationResult, type TaxableItem } from '../tax';
import { printReceipt, type ReceiptData } from '../utils/receipt';

// Import new POS components
import { PageHeader } from '../components/pos/PageHeader';
import { FilterTabs } from '../components/pos/FilterTabs';
import { SearchInput } from '../components/pos/SearchInput';
import { MenuCard } from '../components/pos/MenuCard';
import { CartPanel } from '../components/pos/CartPanel';
import { cn } from '../lib/utils';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  points: number;
  visits: number;
  totalSpent: number;
  lastVisit: string;
}

function POS() {
  const store = useEventStore();
  const { data: menuItems, loading, error, refetch: refetchMenu } = useApi<MenuItem[]>('/api/menu');
  const { data: customers } = useApi<Customer[]>('/api/customers');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'none' | 'pending' | 'paid' | 'failed'>('none');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProvider] = useState<PlaceholderPaymentProvider>(
    createPaymentProvider({ mode: 'placeholder' }) as PlaceholderPaymentProvider
  );
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculationResult | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentTicketIdRef = useRef<string | null>(null);
  const toast = useToast();
  
  // Tax service instance - memoized to prevent recreation
  const taxService = useMemo(() => createTaxService(store), [store]);
  
  const { flags } = useFlags();
  const paymentsEnabled = flags.payments;
  const loyaltyEnabled = flags.loyalty;

  // Use a ref to track events length and prevent infinite re-renders
  const eventsLengthRef = useRef(0);
  const [eventsVersion, setEventsVersion] = useState(0);
  
  // Update events version when length changes
  useMemo(() => {
    const currentLength = store.getAll().length;
    if (currentLength !== eventsLengthRef.current) {
      eventsLengthRef.current = currentLength;
      setEventsVersion(prev => prev + 1);
    }
  }, [store]);
  
  const currentRole = getRole();
  const canManageMenu = RANK[currentRole] >= RANK[Role.BUSINESS_OWNER];

  // Update payment status when events change
  useEffect(() => {
    const ticketId = currentTicketIdRef.current;
    if (ticketId && paymentsEnabled) {
      const events = store.getAll();
      const status = derivePaymentStatus(events, ticketId);
      setPaymentStatus(status);
    } else {
      setPaymentStatus('none');
    }
  }, [eventsVersion, paymentsEnabled, store]);

  // Calculate taxes when cart or customer changes
  useEffect(() => {
    if (cart.length === 0) {
      setTaxCalculation(null);
      return;
    }

    const calculateTaxes = async () => {
      try {
        const taxableItems: TaxableItem[] = cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
          isTaxIncluded: false
        }));

        const taxInput = {
          items: taxableItems,
          customer: selectedCustomer ? {
            id: selectedCustomer.id,
            type: 'individual' as const,
            isBusinessCustomer: false
          } : undefined
        };

        const result = await taxService.calculateTaxes(taxInput);
        setTaxCalculation(result);
      } catch (error) {
        console.error('Tax calculation failed:', error);
        setTaxCalculation(null);
      }
    };

    calculateTaxes();
  }, [cart, selectedCustomer, taxService]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case '/':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          handleNewTicket();
          break;
        case 'Escape':
          if (showMobileCart) {
            setShowMobileCart(false);
          }
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showMobileCart]);
  
  function getTicketId() {
    if (!currentTicketIdRef.current) currentTicketIdRef.current = 'T-' + Date.now();
    return currentTicketIdRef.current;
  }

  function handleNewTicket() {
    currentTicketIdRef.current = null;
    setCart([]);
    setSearchTerm('');
    setSelectedCategory('All');
    setDiscount(0);
    setSelectedCustomer(null);
    setLoyaltyPoints(0);
    setPaymentStatus('none');
    setIsProcessingPayment(false);
    setShowPaymentModal(false);
    // Focus search after clearing
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }
  
  const filteredItems = (menuItems || []).filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const categories = ['All', ...Array.from(new Set((menuItems || []).map(item => item.category)))];
  
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === item.id);
      if (existing) {
        return prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    
    // Show mobile cart briefly when adding items on mobile
    if (window.innerWidth < 1024 && !showMobileCart) {
      setShowMobileCart(true);
      setTimeout(() => setShowMobileCart(false), 2000);
    }
  };
  
  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };
  
  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantity } : item
    ));
  };
  
  // Convert cart items to Line format for totals calculation
  const cartLines: Line[] = cart.map(item => ({
    price: item.price,
    qty: item.quantity,
    taxRate: 0.14 // Default 14% tax rate
  }));
  
  // Calculate loyalty discount
  const loyaltyDiscount = pointsToValue(loyaltyPoints, DEFAULT_LOYALTY_CONFIG);
  const totalDiscount = discount + loyaltyDiscount;
  const baseTotals = computeTotals(cartLines, totalDiscount);
  
  const totals = {
    ...baseTotals,
    tax: taxCalculation?.totalTax || 0,
    total: baseTotals.total + (taxCalculation?.totalTax || 0)
  };
  
  const handleProceedToPayment = () => {
    if (cart.length === 0 || !paymentsEnabled) return;
    setShowPaymentModal(true);
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    
    // If payments are enabled, show payment modal instead of directly placing order
    if (paymentsEnabled) {
      handleProceedToPayment();
      return;
    }
    
    // Direct order placement for when payments are disabled
    setIsProcessingOrder(true);
    try {
      // Finalize the sale locally
      const ticketId = getTicketId();
      const idempotencyKey = `ticket:${ticketId}:finalize`;
      
      const payload = {
        ticketId,
        lines: cartLines.map((line, index) => ({
          sku: cart[index]?.id,
          name: cart[index]?.name || 'Unknown Item',
          qty: line.qty,
          price: line.price,
          taxRate: line.taxRate
        })),
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total
        },
        customerId: selectedCustomer?.id || null
      };
      
      const result = store.append('sale.recorded', payload, {
        key: idempotencyKey,
        params: payload,
        aggregate: {
          id: ticketId,
          type: 'ticket'
        }
      });
      
      if (!result.deduped) {
        // Apply inventory adjustments
        try {
          const policy = getOversellPolicy();
          inventoryEngine.applySale(payload, policy);
        } catch (error) {
          if (error instanceof OversellError) {
            toast.show(`Oversell blocked for ${error.sku}`);
            return;
          }
        }
      }
      
      toast.show('Order placed successfully!');
      handleNewTicket();
    } catch (error) {
      toast.show('Failed to place order. Please try again.');
      console.error('Order placement error:', error);
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const processOrderAfterPayment = async () => {
    if (cart.length === 0) return;
    
    setIsProcessingOrder(true);
    try {
      // Finalize the sale locally
      const ticketId = getTicketId();
      const idempotencyKey = `ticket:${ticketId}:finalize`;
      
      const payload = {
        ticketId,
        lines: cartLines.map((line, index) => ({
          sku: cart[index]?.id,
          name: cart[index]?.name || 'Unknown Item',
          qty: line.qty,
          price: line.price,
          taxRate: line.taxRate
        })),
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total
        },
        customerId: selectedCustomer?.id || null
      };
      
      const result = store.append('sale.recorded', payload, {
        key: idempotencyKey,
        params: payload,
        aggregate: {
          id: ticketId,
          type: 'ticket'
        }
      });
      
      if (!result.deduped) {
        // Apply inventory adjustments
        try {
          const policy = getOversellPolicy();
          inventoryEngine.applySale(payload, policy);
        } catch (error) {
          if (error instanceof OversellError) {
            toast.show(`Oversell blocked for ${error.sku}`);
            return;
          }
        }
      }
      
      // Generate and display receipt
      const receiptData: ReceiptData = {
        ticketId,
        timestamp: new Date().toISOString(),
        cashier: 'Current User', // TODO: Get from auth context
        customer: selectedCustomer ? {
          name: selectedCustomer.name,
          email: selectedCustomer.email,
          phone: selectedCustomer.phone
        } : undefined,
        items: cartLines.map((line, index) => ({
          name: cart[index]?.name || 'Unknown Item',
          quantity: line.qty,
          price: line.price,
          total: line.qty * line.price,
          taxRate: line.taxRate
        })),
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total
        },
        payment: {
          method: 'processed', // This will be updated from payment result
          amount: totals.total
        },
        store: {
          name: 'RMS v3 Restaurant',
          address: '123 Main Street, City, State',
          phone: '(555) 123-4567',
          email: 'info@rmsv3.com'
        }
      };
      
      // For now, just generate and print the receipt
      // In a real application, you might want to show a receipt modal first
      try {
        printReceipt(receiptData);
        toast.show('Order completed! Receipt printed.');
      } catch (error) {
        console.error('Receipt printing failed:', error);
        toast.show('Order completed! (Receipt printing failed)');
      }
      
      handleNewTicket();
    } catch (error) {
      toast.show('Failed to place order. Please try again.');
      console.error('Order placement error:', error);
    } finally {
      setIsProcessingOrder(false);
    }
  };
  
  const handlePaymentComplete = async (result: any) => {
    setShowPaymentModal(false);
    setIsProcessingPayment(true);
    
    try {
      const ticketId = getTicketId();
      const provider = 'placeholder';
      
      if (result.success) {
        const keys = generatePaymentKeys(provider, result.sessionId);
        
        const initiatedResult = store.append('payment.initiated', {
          ticketId,
          provider,
          sessionId: result.sessionId,
          amount: totals.total,
          currency: 'USD',
          paymentMethod: result.paymentMethod
        }, {
          key: keys.initiated,
          params: { paymentResult: result },
          aggregate: { id: ticketId, type: 'ticket' }
        });
        
        if (initiatedResult.deduped) {
          toast.show('Payment already initiated for this ticket.');
          return;
        }

        if (result.paymentMethod === 'cash' || result.paymentMethod === 'loyalty') {
          setTimeout(async () => {
            const webhookResult = handleWebhook(store, {
              provider,
              sessionId: result.sessionId,
              eventType: 'succeeded',
              ticketId,
              amount: totals.total,
              currency: 'USD'
            });
            
            if (webhookResult.success) {
              toast.show(`${result.paymentMethod === 'cash' ? 'Cash' : 'Loyalty'} payment completed!`);
              // Process the order after successful payment
              await processOrderAfterPayment();
            }
          }, 500);
        } else {
          toast.show('Payment initiated. In real app, would redirect to: ' + result.redirectUrl);
          // For card payments, we would normally wait for webhook, but for demo purposes, process immediately
          setTimeout(async () => {
            await processOrderAfterPayment();
          }, 1000);
        }
      }
    } catch (error) {
      toast.show('Failed to process payment');
      console.error('Payment processing error:', error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading menu</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen flex flex-col bg-background">
        {/* Page Header */}
        <PageHeader
          title="Point of Sale"
          breadcrumb={[
            { label: 'Home', href: '/' },
            { label: 'POS' }
          ]}
          actions={
            <>
              {canManageMenu && (
                <button
                  onClick={() => {/* TODO: Implement menu management */}}
                  className={cn(
                    "px-4 py-2 rounded-lg",
                    "border border-border",
                    "bg-background text-foreground",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary",
                    "transition-all duration-200"
                  )}
                >
                  Manage Menu
                </button>
              )}
              <button
                onClick={handleNewTicket}
                disabled={cart.length === 0}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-all duration-200"
                )}
              >
                New Order (N)
              </button>
            </>
          }
        />

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Menu Section */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search and Filters */}
            <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-4 border-b border-border bg-surface">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 max-w-md">
                  <SearchInput
                    ref={searchInputRef}
                    placeholder="Search menu items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClear={() => setSearchTerm('')}
                    showShortcut
                  />
                </div>
                <FilterTabs
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Menu Grid */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No items found</p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="mt-2 text-primary hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                  {filteredItems.map(item => (
                    <MenuCard
                      key={item.id}
                      {...item}
                      onAddToCart={() => addToCart(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Panel - Desktop */}
          <div className="hidden lg:block w-96 border-l border-border">
            <CartPanel
              items={cart}
              totals={totals}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeFromCart}
              onPlaceOrder={placeOrder}
              onClearCart={() => setCart([])}
              isProcessing={isProcessingOrder}
              discount={discount}
              onDiscountChange={setDiscount}
              className="h-full rounded-none border-0"
            />
          </div>
        </div>

        {/* Mobile Cart Toggle */}
        <button
          onClick={() => setShowMobileCart(!showMobileCart)}
          className={cn(
            "lg:hidden fixed bottom-6 right-6 z-40",
            "w-16 h-16 rounded-full shadow-lg",
            "bg-primary text-primary-foreground",
            "flex items-center justify-center",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "transition-all duration-200"
          )}
          aria-label="Toggle cart"
        >
          <div className="relative">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </div>
        </button>

        {/* Mobile Cart Drawer */}
        {showMobileCart && (
          <>
            {/* Backdrop */}
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowMobileCart(false)}
            />
            
            {/* Cart Panel */}
            <div className="lg:hidden fixed right-0 top-0 bottom-0 w-full max-w-md bg-background z-50 shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Cart</h2>
                <button
                  onClick={() => setShowMobileCart(false)}
                  className="p-2 rounded-lg hover:bg-accent"
                  aria-label="Close cart"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <CartPanel
                items={cart}
                totals={totals}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeFromCart}
                onPlaceOrder={() => {
                  placeOrder();
                  setShowMobileCart(false);
                }}
                onClearCart={() => setCart([])}
                isProcessing={isProcessingOrder}
                discount={discount}
                onDiscountChange={setDiscount}
                className="h-[calc(100%-73px)] rounded-none border-0"
              />
            </div>
          </>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentComplete={handlePaymentComplete}
        amount={totals.total}
        currency="USD"
        ticketId={getTicketId()}
        provider={paymentProvider}
        availableMethods={['card', 'cash', 'loyalty']}
      />
    </>
  );
}

export default POS;
