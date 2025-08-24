import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, MenuManagement } from '../components';
import { useApi, apiPost } from '../hooks/useApi';
import { computeTotals, type Line } from '../money/totals';
import { useEventStore } from '../events/context';
import { getRole, RANK, Role } from '../rbac/roles';
import { IdempotencyConflictError } from '../events/types';
import { inventoryEngine } from '../inventory/engine';
import { getOversellPolicy } from '../inventory/policy';
import { OversellError } from '../inventory/types';
import { useToast } from '../components/Toast';
import { getBalance } from '../loyalty/state';
import { pointsToValue, DEFAULT_LOYALTY_CONFIG } from '../loyalty/rules';
import { useFlags } from '../store/flags';
import { defaultProvider, createPaymentProvider, type PlaceholderPaymentProvider } from '../payments/provider';
import { generatePaymentKeys, handleWebhook } from '../payments/webhook';
import { derivePaymentStatus } from '../payments/status';
import { isPaymentInitiated } from '../events/guards';
import { PaymentModal } from '../components/PaymentModal';
import { createTaxService, type TaxCalculationResult, type TaxableItem } from '../tax';

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

interface Order {
  id?: string;
  items: { id: string; quantity: number }[];
  total: number;
  status?: string;
  timestamp?: string;
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
  const [isFinalizingLocal, setIsFinalizingLocal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'none' | 'pending' | 'paid' | 'failed'>('none');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<PlaceholderPaymentProvider>(
    createPaymentProvider({ mode: 'placeholder' }) as PlaceholderPaymentProvider
  );
  const [taxCalculation, setTaxCalculation] = useState<TaxCalculationResult | null>(null);
  const [showMenuManagement, setShowMenuManagement] = useState(false);
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
  const canFinalize = RANK[currentRole] >= RANK[Role.ADMIN];

  // Handle menu updates
  const handleMenuUpdated = () => {
    refetchMenu();
  };
  
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
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  function getTicketId() {
    if (!currentTicketIdRef.current) currentTicketIdRef.current = 'T-' + Date.now();
    return currentTicketIdRef.current;
  }

  function newTicket() {
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

  const handleNewTicket = newTicket;
  
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
    taxRate: 0.14 // Default 14% tax rate - could be item-specific in future
  }));
  
  // Calculate loyalty discount
  const loyaltyDiscount = pointsToValue(loyaltyPoints, DEFAULT_LOYALTY_CONFIG);
  const totalDiscount = discount + loyaltyDiscount;
  const baseTotals = computeTotals(cartLines, totalDiscount);
  
  // Calculate taxes
  const taxableItems: TaxableItem[] = cart.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    category: item.category,
    isTaxIncluded: false // Assume tax is additional
  }));
  
  const totals = {
    ...baseTotals,
    tax: taxCalculation?.totalTax || 0,
    total: baseTotals.total + (taxCalculation?.totalTax || 0)
  };
  
  const placeOrder = async () => {
    if (cart.length === 0) return;
    
    setIsProcessingOrder(true);
    try {
      const order: Order = {
        items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
        total: totals.total
      };
      
      await apiPost('/api/orders', order);
      setCart([]);
      alert('Order placed successfully!');
    } catch (error) {
      alert('Failed to place order. Please try again.');
    } finally {
      setIsProcessingOrder(false);
    }
  };
  
  const finalizeLocal = async () => {
    if (cart.length === 0) return;
    
    setIsFinalizingLocal(true);
    setToastMessage('');
    
    try {
      // Get stable ticket ID
      const ticketId = getTicketId();
      
      // Build idempotency key
      const idempotencyKey = `ticket:${ticketId}:finalize`;
      
      // Build params from current cart and totals
      const params = {
        cart: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          total: totals.total
        },
        customerId: selectedCustomer?.id || null,
        loyaltyPoints
      };
      
      // Build event payload
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
      
      // Append to event store
      const result = store.append('sale.recorded', payload, {
        key: idempotencyKey,
        params,
        aggregate: {
          id: ticketId,
          type: 'ticket'
        }
      });
      
      // Create loyalty events if customer is selected and loyalty is enabled
      if (loyaltyEnabled && selectedCustomer) {
        // Create loyalty.redeemed event if points were used
        if (loyaltyPoints > 0) {
          const redemptionPayload = {
            customerId: selectedCustomer.id,
            ticketId,
            points: loyaltyPoints,
            value: pointsToValue(loyaltyPoints, DEFAULT_LOYALTY_CONFIG)
          };
          
          store.append('loyalty.redeemed', redemptionPayload, {
            key: `loyalty:redeem:${ticketId}:${selectedCustomer.id}`,
            params: redemptionPayload
          });
        }
        
        // Create loyalty.accrued event for points earned from purchase
        const earnedPoints = Math.floor(totals.total / DEFAULT_LOYALTY_CONFIG.ACCRUAL_UNIT) * DEFAULT_LOYALTY_CONFIG.POINTS_PER_UNIT;
        if (earnedPoints > 0) {
          const accrualPayload = {
            customerId: selectedCustomer.id,
            ticketId,
            points: earnedPoints
          };
          
          store.append('loyalty.accrued', accrualPayload, {
            key: `loyalty:accrue:${ticketId}:${selectedCustomer.id}`,
            params: accrualPayload
          });
        }
      }
      
      if (result.deduped) {
        const msg = 'Sale finalized successfully (deduped).';
        toast.show(msg);
      } else {
        
        // Apply inventory adjustments after successful sale recording
        try {
          const policy = getOversellPolicy();
          const inventoryReport = inventoryEngine.applySale(payload, policy);
          
          const msg = 'Sale finalized successfully.';
          const alertMsg = inventoryReport.alerts?.length ? ` Alerts: ${inventoryReport.alerts.join(' | ')}` : '';
          toast.show(msg + alertMsg);
          
          // Clear cart after successful finalization
          newTicket();
        } catch (error) {
          if (error instanceof OversellError) {
            toast.show(`Oversell blocked for ${error.sku}`);
            return; // Don't clear cart if oversell blocked
          } else {
            toast.show('Inventory adjustment failed');
            console.error('Inventory error:', error);
          }
        }
      }
      
    } catch (error) {
      if (error instanceof IdempotencyConflictError) {
        toast.show('Conflict: parameter mismatch');
      } else {
        toast.show('Error finalizing sale');
      }
      console.error('Local finalization error:', error);
    } finally {
      setIsFinalizingLocal(false);
    }
  };
  
  const takePayment = () => {
    if (cart.length === 0 || !paymentsEnabled) return;
    setShowPaymentModal(true);
  };

  const handlePaymentComplete = async (result: any) => {
    setShowPaymentModal(false);
    setIsProcessingPayment(true);
    
    try {
      const ticketId = getTicketId();
      const provider = 'placeholder';
      
      if (result.success) {
        // Generate idempotency key for payment initiation
        const keys = generatePaymentKeys(provider, result.sessionId);
        
        // Append PaymentInitiated event
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

        // For direct payments (cash, loyalty), immediately simulate success
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
            }
          }, 500); // Small delay for realism
        } else {
          // For card payments, show redirect message
          toast.show('Payment initiated. In real app, would redirect to: ' + result.redirectUrl);
          console.log('Redirect URL:', result.redirectUrl);
        }
      }
    } catch (error) {
      toast.show('Failed to process payment');
      console.error('Payment processing error:', error);
    } finally {
      setIsProcessingPayment(false);
    }
  };
  
  const simulatePaymentSuccess = async () => {
    const ticketId = getTicketId();
    const events = store.getByAggregate(ticketId);
    const initiatedEvent = events.find(isPaymentInitiated);
    
    if (!initiatedEvent) {
      toast.show('No payment initiated for this ticket');
      return;
    }
    
    try {
      const result = handleWebhook(store, {
        provider: initiatedEvent.payload.provider,
        sessionId: initiatedEvent.payload.sessionId,
        eventType: 'succeeded',
        ticketId,
        amount: initiatedEvent.payload.amount,
        currency: initiatedEvent.payload.currency
      });
      
      if (result.success) {
        toast.show(result.deduped ? 'Payment success (deduped)' : 'Payment succeeded!');
      } else {
        toast.show(`Payment simulation failed: ${result.error}`);
      }
    } catch (error) {
      toast.show('Failed to simulate payment success');
      console.error('Payment simulation error:', error);
    }
  };
  
  const simulatePaymentFailure = async () => {
    const ticketId = getTicketId();
    const events = store.getByAggregate(ticketId);
    const initiatedEvent = events.find(isPaymentInitiated);
    
    if (!initiatedEvent) {
      toast.show('No payment initiated for this ticket');
      return;
    }
    
    try {
      const result = handleWebhook(store, {
        provider: initiatedEvent.payload.provider,
        sessionId: initiatedEvent.payload.sessionId,
        eventType: 'failed',
        ticketId,
        amount: initiatedEvent.payload.amount,
        currency: initiatedEvent.payload.currency,
        reason: 'Insufficient funds'
      });
      
      if (result.success) {
        toast.show(result.deduped ? 'Payment failure (deduped)' : 'Payment failed!');
      } else {
        toast.show(`Payment simulation failed: ${result.error}`);
      }
    } catch (error) {
      toast.show('Failed to simulate payment failure');
      console.error('Payment simulation error:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Error loading menu: {error}</p>
      </div>
    );
  }

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Menu Section */}
      <div className="lg:col-span-2 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {showMenuManagement ? 'Menu Management' : 'Point of Sale'}
            </h1>
            {canFinalize && (
              <Button
                variant="outline"
                onClick={() => setShowMenuManagement(!showMenuManagement)}
              >
                {showMenuManagement ? 'Back to POS' : 'Manage Menu'}
              </Button>
            )}
          </div>
          {!showMenuManagement && (
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative max-w-md">
                <Input
                  ref={searchInputRef}
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                  Press / to focus
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {showMenuManagement ? (
          <MenuManagement onItemUpdated={handleMenuUpdated} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {item.image && (
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-32 object-cover rounded-md mb-3"
                  />
                )}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{item.name}</h3>
                  <span className="text-sm text-gray-500">{item.category}</span>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.description}</p>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${item.price.toFixed(2)}
                  </span>
                  <Button size="sm" onClick={() => addToCart(item)}>
                    Add to Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        )}
      </div>
      
      {/* Cart Section - only show when not in menu management mode */}
      {!showMenuManagement && (
        <div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Current Order {cart.length > 0 && `(Items: ${cart.reduce((sum, item) => sum + item.quantity, 0)})`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items in cart</p>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-500">${item.price.toFixed(2)} each</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 p-0"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 p-0"
                        >
                          +
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => removeFromCart(item.id)}
                          className="w-8 h-8 p-0 text-red-600 hover:text-red-700"
                        >
                          ×
                        </Button>
                      </div>
                      <div className="w-20 text-right font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Customer Selection */}
                <div className="border-t pt-4 space-y-3">
                  <div className="space-y-2">
                    <Select
                      label="Customer"
                      placeholder="No customer selected"
                      value={selectedCustomer?.id || ''}
                      onChange={(e) => {
                        const customer = customers?.find(c => c.id === e.target.value) || null;
                        setSelectedCustomer(customer);
                        setLoyaltyPoints(0); // Reset loyalty points when customer changes
                      }}
                      options={(customers || []).map(customer => ({
                        value: customer.id,
                        label: `${customer.name} (${customer.points} pts)`
                      }))}
                    />
                  </div>
                  
                  {/* Loyalty Points */}
                  {loyaltyEnabled && selectedCustomer && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Redeem Points (Available: {getBalance(selectedCustomer.id) || selectedCustomer.points})
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={loyaltyPoints}
                          onChange={(e) => {
                            const points = Math.max(0, parseInt(e.target.value) || 0);
                            const maxPoints = getBalance(selectedCustomer.id) || selectedCustomer.points;
                            const finalPoints = Math.min(points, maxPoints);
                            setLoyaltyPoints(finalPoints);
                          }}
                          placeholder="0"
                          className="flex-1 h-8 text-sm"
                          min="0"
                          max={getBalance(selectedCustomer.id) || selectedCustomer.points}
                        />
                        <span className="text-sm text-gray-500">
                          = ${loyaltyDiscount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Subtotal:</span>
                    <span>${totals.subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center gap-2">
                    <span>Discount:</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0.00"
                        className="w-20 h-8 text-sm text-right"
                        step="0.01"
                        min="0"
                      />
                      <span className="text-red-600 dark:text-red-400">
                        -${totals.discount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {loyaltyEnabled && selectedCustomer && loyaltyPoints > 0 && (
                    <div className="flex justify-between items-center">
                      <span>Loyalty Discount:</span>
                      <span className="text-red-600 dark:text-red-400">
                        -${loyaltyDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {/* Tax breakdown */}
                  {taxCalculation && taxCalculation.totalTax > 0 ? (
                    <div className="space-y-1">
                      {taxCalculation.taxBreakdown.map((tax, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span>{tax.taxRate.displayName} ({(tax.taxRate.rate * 100).toFixed(2)}%):</span>
                          <span>${tax.taxAmount.toFixed(2)}</span>
                        </div>
                      ))}
                      {taxCalculation.taxBreakdown.length > 1 && (
                        <div className="flex justify-between items-center font-medium border-t pt-1">
                          <span>Total Tax:</span>
                          <span>${taxCalculation.totalTax.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span>Tax:</span>
                      <span>$0.00</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 dark:text-green-400">
                        ${totals.total.toFixed(2)}
                      </span>
                      {paymentsEnabled && paymentStatus !== 'none' && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          paymentStatus === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {paymentStatus === 'pending' ? 'Pending' :
                           paymentStatus === 'paid' ? 'Paid' : 'Failed'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={placeOrder}
                    disabled={isProcessingOrder || cart.length === 0}
                  >
                    {isProcessingOrder ? 'Processing...' : 'Place Order'}
                  </Button>
                  
                  {paymentsEnabled && (
                    <Button 
                      className="w-full" 
                      size="lg"
                      variant="outline"
                      onClick={takePayment}
                      disabled={isProcessingPayment || cart.length === 0 || paymentStatus === 'paid'}
                    >
                      {isProcessingPayment ? 'Processing...' : 'Take Payment'}
                    </Button>
                  )}
                  
                  {canFinalize && (
                    <Button 
                      className="w-full" 
                      size="lg"
                      variant="outline"
                      onClick={finalizeLocal}
                      disabled={isFinalizingLocal || cart.length === 0}
                    >
                      {isFinalizingLocal ? 'Finalizing...' : 'Finalize (local)'}
                    </Button>
                  )}
                  
                  {/* Dev simulation buttons - only show when payments enabled and payment initiated */}
                  {paymentsEnabled && paymentStatus === 'pending' && (
                    <div className="border-t pt-2 space-y-1">
                      <div className="text-xs text-gray-500 text-center mb-2">Dev Simulation</div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={simulatePaymentSuccess}
                          className="text-green-600 border-green-300 hover:bg-green-50"
                        >
                          Simulate Success
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={simulatePaymentFailure}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          Simulate Fail
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleNewTicket}
                    disabled={cart.length === 0}
                  >
                    New Ticket (N)
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setCart([])}
                    disabled={cart.length === 0}
                  >
                    Clear Cart
                  </Button>
                  {toastMessage && (
                    <div className="p-2 text-sm text-center rounded bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                      {toastMessage}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        </div>
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