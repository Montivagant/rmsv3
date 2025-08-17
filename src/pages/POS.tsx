import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select } from '../components';
import { useApi, apiPost } from '../hooks/useApi';
import { computeTotals, type Line } from '../money/totals';
import { eventStore } from '../events/store';
import { getRole, RANK, Role } from '../rbac/roles';
import { IdempotencyConflictError } from '../events/types';
import { inventoryEngine } from '../inventory/engine';
import { getOversellPolicy } from '../inventory/policy';
import { OversellError } from '../inventory/types';
import { useToast } from '../components/Toast';
import { getBalance } from '../loyalty/state';
import { pointsToValue, DEFAULT_LOYALTY_CONFIG } from '../loyalty/rules';
import { loadFlags } from '../lib/flags';
import { defaultProvider } from '../payments/provider';
import { generatePaymentKeys, handleWebhook } from '../payments/webhook';
import { derivePaymentStatus } from '../payments/status';

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
  const { data: menuItems, loading, error } = useApi<MenuItem[]>('/api/menu');
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentTicketIdRef = useRef<string | null>(null);
  const toast = useToast();
  
  const flags = loadFlags();
  const paymentsEnabled = flags.payments;
  
  const currentRole = getRole();
  const canFinalize = RANK[currentRole] >= RANK[Role.ADMIN];
  
  // Update payment status when events change
  useEffect(() => {
    const ticketId = currentTicketIdRef.current;
    if (ticketId && paymentsEnabled) {
      const events = eventStore.getAll();
      const status = derivePaymentStatus(events, ticketId);
      setPaymentStatus(status);
    } else {
      setPaymentStatus('none');
    }
  }, [eventStore.getAll().length, paymentsEnabled]);
  
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
  
  // Calculate loyalty discount value
  const loyaltyDiscount = pointsToValue(loyaltyPoints, DEFAULT_LOYALTY_CONFIG);
  const totalDiscount = discount + loyaltyDiscount;
  const totals = computeTotals(cartLines, totalDiscount);
  
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
      const result = eventStore.append('sale.recorded', payload, {
        key: idempotencyKey,
        params,
        aggregate: {
          id: ticketId,
          type: 'ticket'
        }
      });
      
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
  
  const takePayment = async () => {
    if (cart.length === 0 || !paymentsEnabled) return;
    
    setIsProcessingPayment(true);
    try {
      const ticketId = getTicketId();
      const provider = 'mock';
      
      // Create checkout with provider
      const checkoutResult = await defaultProvider.createCheckout({
        ticketId,
        amount: totals.total,
        currency: 'USD'
      });
      
      // Generate idempotency key for payment initiation
      const keys = generatePaymentKeys(provider, checkoutResult.sessionId);
      
      // Append payment.initiated event
      const result = eventStore.append('payment.initiated', {
        ticketId,
        provider,
        sessionId: checkoutResult.sessionId,
        amount: totals.total,
        currency: 'USD',
        redirectUrl: checkoutResult.redirectUrl
      }, {
        key: keys.initiated,
        params: { ticketId, amount: totals.total, sessionId: checkoutResult.sessionId },
        aggregate: { id: ticketId, type: 'ticket' }
      });
      
      if (result.deduped) {
        toast.show('Payment already initiated for this ticket.');
      } else {
        toast.show('Payment initiated. Redirecting to payment provider...');
        // In a real app, we would redirect to checkoutResult.redirectUrl
        console.log('Redirect URL:', checkoutResult.redirectUrl);
      }
      
    } catch (error) {
      toast.show('Failed to initiate payment');
      console.error('Payment initiation error:', error);
    } finally {
      setIsProcessingPayment(false);
    }
  };
  
  const simulatePaymentSuccess = async () => {
    const ticketId = getTicketId();
    const events = eventStore.getByAggregate(ticketId);
    const initiatedEvent = events.find(e => e.type === 'payment.initiated');
    
    if (!initiatedEvent) {
      toast.show('No payment initiated for this ticket');
      return;
    }
    
    try {
      const result = handleWebhook(eventStore, {
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
    const events = eventStore.getByAggregate(ticketId);
    const initiatedEvent = events.find(e => e.type === 'payment.initiated');
    
    if (!initiatedEvent) {
      toast.show('No payment initiated for this ticket');
      return;
    }
    
    try {
      const result = handleWebhook(eventStore, {
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Menu Section */}
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Point of Sale
          </h1>
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
        </div>
        
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
      </div>
      
      {/* Cart Section */}
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
                  {selectedCustomer && (
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
                            setLoyaltyPoints(Math.min(points, maxPoints));
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
                  
                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between items-center">
                      <span>Loyalty Discount:</span>
                      <span className="text-red-600 dark:text-red-400">
                        -${loyaltyDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span>Tax (14%):</span>
                    <span>${totals.tax.toFixed(2)}</span>
                  </div>
                  
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
    </div>
  );
}

export default POS;