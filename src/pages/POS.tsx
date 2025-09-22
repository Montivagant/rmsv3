import { useState, useEffect, useRef, useMemo } from 'react';
import type { MenuItem as MenuItemEntity } from '../menu/items/types';
import type { CustomerRecord } from '../customers/repository';
import { useMenuItems } from '../hooks/useMenuItems';
import { useCustomers } from '../hooks/useCustomers';
import { recordInventoryAdjustments } from '../inventory/repository';
import { ordersApi } from '../orders/api';
import { getCurrentBranchId } from '../lib/branch';
import { computeTotals, type Line } from '../money/totals';
import { useEventStore } from '../events/context';
import type { SaleRecordedPayload } from '../events/types';
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
import { PaymentModal } from '../components';
import { createTaxService, type TaxCalculationResult, type TaxableItem } from '../tax';
import { printReceipt, type ReceiptData } from '../utils/receipt';
import { requireReturnPin, getReturnPin, getReturnStage } from '../settings/returns';

// Import new POS components
import { FilterTabs } from '../components/pos/FilterTabs';
import { SearchInput } from '../components/pos/SearchInput';
import { MenuCard } from '../components/pos/MenuCard';
import { MenuList } from '../components/pos/MenuList';
import { ViewToggle, type ViewMode } from '../components/pos/ViewToggle';
import { CartPanel } from '../components/pos/CartPanel';
import { cn } from '../lib/utils';
// Clock-in functionality moved to standalone page

// function formatCategoryLabel(categoryId: string): string { // Unused
//   if (!categoryId) return 'General';
//   const cleaned = categoryId
//     .replace(/^cat[_-]/i, '')
//     .replace(/[_-]/g, ' ')
//     .trim();
//   if (!cleaned) return 'General';
//   return cleaned.split(' ').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
// }

interface CartItem extends MenuItemEntity {
  quantity: number;
}

function POS() {
  const store = useEventStore();
  const branchId = getCurrentBranchId();
  const { items: menuItems, loading: menuLoading, error: menuError } = useMenuItems({ branchId });
  const {
    customers: customerDirectory,
    loading: customersLoading,
    error: customersError,
    searchCustomers: searchCustomersRepo,
  } = useCustomers();
  const loading = menuLoading || customersLoading;
  const error = menuError || customersError;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'none' | 'pending' | 'paid' | 'failed'>('none');
  // const [isProcessingPayment, setIsProcessingPayment] = useState(false); // Unused
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProvider] = useState<PlaceholderPaymentProvider>(
    createPaymentProvider({ mode: 'placeholder' }) as PlaceholderPaymentProvider
  );
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculationResult | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  // const [isVoiding, setIsVoiding] = useState(false); // Unused
  // const [isReturning, setIsReturning] = useState(false); // Unused
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentTicketIdRef = useRef<string | null>(null);
  const toast = useToast();
  
  // Tax service instance - memoized to prevent recreation
  const taxService = useMemo(() => createTaxService(store), [store]);
  
  const { flags } = useFlags();
  const paymentsEnabled = flags.payments;
  // const loyaltyEnabled = flags.loyalty; // Unused
  
  // Use a ref to track events length and prevent infinite re-renders
  const eventsLengthRef = useRef(0);
  const [eventsVersion, setEventsVersion] = useState(0);
  
  // Update events version when length changes
  useEffect(() => {
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
      setPaymentStatus(status || 'none');
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
          category: item.categoryId,
          isTaxIncluded: false
        }));

        const taxInput = {
          items: taxableItems,
          ...(selectedCustomer && {
            customer: {
              id: selectedCustomer.id,
              type: 'individual' as const,
              isBusinessCustomer: false
            }
          })
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
    // setIsProcessingPayment(false); // Function commented out
    setShowPaymentModal(false);
    setOrderNotes('');
    // setIsVoiding(false); // Function commented out
    // setIsReturning(false); // Function commented out
    // Focus search after clearing
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }

  function checkReturnPinGuard(): boolean {
    if (!requireReturnPin()) return true;
    const pin = window.prompt('Enter Return PIN');
    if (!pin) return false;
    return pin.trim() === getReturnPin();
  }

  function isReturnAllowedAtStage(stage: 'before_payment' | 'same_day' | 'anytime_with_approval'): boolean {
    switch (stage) {
      case 'before_payment':
        return paymentStatus === 'none' || paymentStatus === 'failed' || paymentStatus === 'pending';
      case 'same_day':
        return true; // simplified check for demo
      case 'anytime_with_approval':
        return true;
      default:
        return false;
    }
  }

  function handleVoidOrder() {
    const stage = getReturnStage();
    if (stage !== 'before_payment') {
      toast.show('Void allowed only before payment');
      return;
    }
    if (requireReturnPin() && !checkReturnPinGuard()) {
      toast.show('Invalid PIN');
      return;
    }
    // setIsVoiding(true); // Function commented out
    try {
      const ticketId = getTicketId();
      const idempotencyKey = `ticket:${ticketId}:void`;
      const payload = {
        ticketId,
        reason: orderNotes || 'void',
        items: cart.map(i => ({ sku: i.id, name: i.name, qty: i.quantity, price: i.price })),
      } as const;
      store.append('sale.voided', payload, {
        key: idempotencyKey,
        params: payload,
        aggregate: { id: ticketId, type: 'ticket' }
      });
      toast.show('Order voided');
      handleNewTicket();
    } finally {
      // setIsVoiding(false); // Function commented out
    }
  }

  function handleReturnItems() {
    const stage = getReturnStage();
    if (!isReturnAllowedAtStage(stage)) {
      toast.show('Return not allowed at this stage');
      return;
    }
    if (requireReturnPin() && !checkReturnPinGuard()) {
      toast.show('Invalid PIN');
      return;
    }
    // setIsReturning(true); // Function commented out
    try {
      const ticketId = getTicketId();
      const idempotencyKey = `ticket:${ticketId}:return`;
      const payload = {
        ticketId,
        reason: orderNotes || 'return',
        items: cart.map(i => ({ sku: i.id, name: i.name, qty: i.quantity, price: i.price })),
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total
        }
      } as const;
      store.append('sale.returned', payload, {
        key: idempotencyKey,
        params: payload,
        aggregate: { id: ticketId, type: 'ticket' }
      });
      try {
        const receiptData: ReceiptData = {
          ticketId,
          timestamp: new Date().toISOString(),
          cashier: 'Current User',
        ...(selectedCustomer && {
          customer: {
            name: selectedCustomer.name,
            ...(selectedCustomer.email && { email: selectedCustomer.email }),
            ...(selectedCustomer.phone && { phone: selectedCustomer.phone })
          }
        }),
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
            method: 'return',
            amount: -Math.abs(totals.total)
          },
          store: {
            name: 'RMS v3 Restaurant'
          }
        };
        printReceipt(receiptData);
      } catch {}
      toast.show('Return recorded and receipt printed');
      handleNewTicket();
    } finally {
      // setIsReturning(false); // Function commented out
    }
  }

  // Clock-in/Clock-out functions moved to standalone Clock-in page
  
  const filteredItems = (menuItems || []).filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  const categories = ['All', ...Array.from(new Set((menuItems || []).map(item => item.categoryId)))];
  
  const addToCart = (item: MenuItemEntity) => {
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
  
  // Search customers function
  const searchCustomers = async (query: string): Promise<CustomerRecord[]> => {
    if (!query || query.length < 2) return customerDirectory;
    return searchCustomersRepo(query);
  };
  
  const handleProceedToPayment = () => {
    if (cart.length === 0 || !paymentsEnabled) return;
    setShowPaymentModal(true);
  };

  const finalizeSale = async (markCompleted: boolean) => {
    const ticketId = getTicketId();
    const payload: SaleRecordedPayload = {
      ticketId,
      lines: cartLines.map((line, index) => ({
        sku: cart[index]?.id,
        name: cart[index]?.name || 'Unknown Item',
        qty: line.qty,
        price: line.price,
        taxRate: line.taxRate,
      })),
      totals: {
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
      },
    };
    
    if (selectedCustomer?.id) {
      payload.customerId = selectedCustomer.id;
    }
    
    if (orderNotes) {
      payload.notes = orderNotes;
    }

    const saleResult = store.append('sale.recorded', payload, {
      key: `ticket:${ticketId}:finalize`,
      params: payload,
      aggregate: { id: ticketId, type: 'ticket' },
    });

    if (!saleResult.deduped) {
      try {
        const policy = getOversellPolicy();
        const report = inventoryEngine.applySale(payload, policy);
        if (report.adjustments.length > 0) {
          await recordInventoryAdjustments(
            report.adjustments.map(adj => ({
              sku: adj.sku,
              oldQty: adj.oldQty,
              newQty: adj.newQty,
              reason: 'sale',
              reference: ticketId,
            }))
          );
        }
      } catch (error) {
        if (error instanceof OversellError) {
          throw error;
        }
        console.error('Inventory adjustment failed:', error);
      }
    }

    const orderId = `order-${ticketId}`;
    try {
      await ordersApi.create({
        orderId,
        ticketId,
        branchId,
        source: 'POS',
        status: 'preparing',
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
        },
        ...(selectedCustomer?.id && { customerId: selectedCustomer.id }),
        ...(selectedCustomer?.name && { customerName: selectedCustomer.name }),
        ...(orderNotes && { notes: orderNotes }),
        channel: 'in_store',
        createdAt: Date.now(),
      });
      if (markCompleted) {
        await ordersApi.updateStatus(orderId, { status: 'completed', actorName: 'POS Terminal' });
      }
    } catch (error) {
      console.error('Order persistence failed:', error);
    }

    return { payload, ticketId, orderId };
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;

    if (paymentsEnabled) {
      handleProceedToPayment();
      return;
    }

    setIsProcessingOrder(true);
    try {
      await finalizeSale(true);
      toast.show('Order placed successfully!');
      handleNewTicket();
    } catch (error) {
      if (error instanceof OversellError) {
        toast.show(`Oversell blocked for ${error.sku}`);
      } else {
        toast.show('Failed to place order. Please try again.');
        console.error('Order placement error:', error);
      }
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const processOrderAfterPayment = async () => {
    if (cart.length === 0) return;

    setIsProcessingOrder(true);
    try {
      const { ticketId } = await finalizeSale(true);

      const receiptData: ReceiptData = {
        ticketId,
        timestamp: new Date().toISOString(),
        cashier: 'Current User',
        ...(selectedCustomer && {
          customer: {
            name: selectedCustomer.name,
            ...(selectedCustomer.email && { email: selectedCustomer.email }),
            ...(selectedCustomer.phone && { phone: selectedCustomer.phone })
          }
        }),
        items: cartLines.map((line, index) => ({
          name: cart[index]?.name || 'Unknown Item',
          quantity: line.qty,
          price: line.price,
          total: line.qty * line.price,
          taxRate: line.taxRate,
        })),
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total,
        },
        payment: {
          method: 'processed',
          amount: totals.total,
        },
        store: {
          name: 'RMS v3 Restaurant',
          address: '123 Main Street, City, State',
          phone: '(555) 123-4567',
          email: 'info@rmsv3.com',
        },
      };

      try {
        printReceipt(receiptData);
        toast.show('Order completed! Receipt printed.');
      } catch (error) {
        console.error('Receipt printing failed:', error);
        toast.show('Order completed! (Receipt printing failed)');
      }

      handleNewTicket();
    } catch (error) {
      if (error instanceof OversellError) {
        toast.show(`Oversell blocked for ${error.sku}`);
      } else {
        toast.show('Failed to place order. Please try again.');
        console.error('Order placement error:', error);
      }
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handlePaymentComplete = async (result: any) => {
    setShowPaymentModal(false);
    // setIsProcessingPayment(true); // Function commented out
    
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
          currency: 'EGP',
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
              currency: 'EGP'
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
      // setIsProcessingPayment(false); // Function commented out
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
        {/* POS Header - integrated with layout, no separate page header needed */}
        <div className="bg-surface border-b border-border px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-foreground">Point of Sale</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* existing Manage Menu button remains hidden */}
              {canManageMenu && (
                <button
                  onClick={() => { /* Hidden until implemented */ }}
                  className={cn(
                    'hidden',
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
            </div>
          </div>
        </div>

        {/* Main Content - with right margin for fixed cart */}
        <div className="flex-1 lg:mr-96 overflow-hidden">
          {/* Menu Section */}
          <div className="flex flex-col h-full overflow-hidden">
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
                <ViewToggle
                  currentView={viewMode}
                  onViewChange={setViewMode}
                />
              </div>
            </div>

            {/* Menu Display - Card or List View */}
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
              ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                  {filteredItems.map(item => (
                    <MenuCard
                      key={item.id}
                      {...item}
                      category={item.categoryId}
                      onAddToCart={() => addToCart(item)}
                    />
                  ))}
                </div>
              ) : (
                <MenuList
                  items={filteredItems.map(item => ({
                    ...item,
                    category: item.categoryId,
                    onAddToCart: () => addToCart(item)
                  }))}
                />
              )}
            </div>
          </div>
        </div>

        {/* Cart Panel - Desktop (Fixed Position) - Positioned below global navigation and POS header */}
        <div className="hidden lg:block fixed top-[180px] right-0 w-96 h-[calc(100vh-180px)] border-l border-border bg-surface z-30">
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
            selectedCustomer={selectedCustomer ? {
              id: selectedCustomer.id,
              email: selectedCustomer.email,
              firstName: selectedCustomer.name.split(' ')[0] || '',
              lastName: selectedCustomer.name.split(' ').slice(1).join(' ') || '',
              phone: selectedCustomer.phone,
              loyaltyPoints: selectedCustomer.points
            } : null}
            onCustomerChange={(customer) => {
              if (customer) {
                const customerRecord: CustomerRecord = {
                  id: customer.id,
                  name: `${customer.firstName} ${customer.lastName}`.trim(),
                  email: customer.email,
                  phone: customer.phone || '',
                  points: customer.loyaltyPoints || 0,
                  orders: 0,
                  totalSpent: 0,
                  visits: 0,
                  tags: [],
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                };
                setSelectedCustomer(customerRecord);
              } else {
                setSelectedCustomer(null);
              }
            }}
            searchCustomers={async (query) => {
              const results = await searchCustomers(query);
              return results.map(record => ({
                id: record.id,
                email: record.email,
                firstName: record.name.split(' ')[0] || '',
                lastName: record.name.split(' ').slice(1).join(' ') || '',
                phone: record.phone,
                loyaltyPoints: record.points
              }));
            }}
            orderNotes={orderNotes}
            onOrderNotesChange={setOrderNotes}
            className="h-full rounded-none border-0"
            onVoidOrder={handleVoidOrder}
            onReturnItems={handleReturnItems}
          />
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
              className="lg:hidden drawer-backdrop z-40"
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
                selectedCustomer={selectedCustomer ? {
                  id: selectedCustomer.id,
                  email: selectedCustomer.email,
                  firstName: selectedCustomer.name.split(' ')[0] || '',
                  lastName: selectedCustomer.name.split(' ').slice(1).join(' ') || '',
                  phone: selectedCustomer.phone,
                  loyaltyPoints: selectedCustomer.points
                } : null}
                onCustomerChange={(customer) => {
                  if (customer) {
                    const customerRecord: CustomerRecord = {
                      id: customer.id,
                      name: `${customer.firstName} ${customer.lastName}`.trim(),
                      email: customer.email,
                      phone: customer.phone || '',
                      points: customer.loyaltyPoints || 0,
                      orders: 0,
                      totalSpent: 0,
                      visits: 0,
                      tags: [],
                      createdAt: Date.now(),
                      updatedAt: Date.now()
                    };
                    setSelectedCustomer(customerRecord);
                  } else {
                    setSelectedCustomer(null);
                  }
                }}
                searchCustomers={async (query) => {
                  const results = await searchCustomers(query);
                  return results.map(record => ({
                    id: record.id,
                    email: record.email,
                    firstName: record.name.split(' ')[0] || '',
                    lastName: record.name.split(' ').slice(1).join(' ') || '',
                    phone: record.phone,
                    loyaltyPoints: record.points
                  }));
                }}
                orderNotes={orderNotes}
                onOrderNotesChange={setOrderNotes}
                className="h-[calc(100%-73px)] rounded-none border-0"
                onVoidOrder={() => { handleVoidOrder(); setShowMobileCart(false); }}
                onReturnItems={() => { handleReturnItems(); setShowMobileCart(false); }}
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
        currency="EGP"
        ticketId={getTicketId()}
        provider={paymentProvider}
        availableMethods={['card', 'cash', 'loyalty']}
      />
    </>
  );
}

export default POS;









