import { useState } from 'react';
import { Button, Input, Modal } from './index';
import { formatCurrency } from '../lib/format';
import type { PlaceholderPaymentProvider, DirectPaymentParams } from '../payments/provider';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: (result: any) => void;
  amount: number;
  currency?: string;
  ticketId: string;
  provider: PlaceholderPaymentProvider;
  availableMethods: ('card' | 'cash' | 'loyalty')[];
}

interface PaymentMethodConfig {
  id: 'card' | 'cash' | 'loyalty';
  name: string;
  icon: string;
  description: string;
  isDirect: boolean;
}

const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'card',
    name: 'Credit/Debit Card',
    icon: 'ðŸ’³',
    description: 'Pay with your card via secure checkout',
    isDirect: false
  },
  {
    id: 'cash',
    name: 'Cash',
    icon: 'ðŸ’µ',
    description: 'Pay with cash in person',
    isDirect: true
  },
  {
    id: 'loyalty',
    name: 'Loyalty Points',
    icon: 'â­',
    description: 'Pay using your loyalty points',
    isDirect: true
  }
];

export function PaymentModal({
  isOpen,
  onClose,
  onPaymentComplete,
  amount,
  currency = 'USD',
  ticketId,
  provider,
  availableMethods
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'cash' | 'loyalty'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashAmount, setCashAmount] = useState(amount.toString());
  const [loyaltyPoints, setLoyaltyPoints] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredMethods = PAYMENT_METHODS.filter(method => 
    availableMethods.includes(method.id)
  );

  const selectedMethodConfig = filteredMethods.find(m => m.id === selectedMethod);

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      if (selectedMethod === 'cash' || selectedMethod === 'loyalty') {
        // Handle direct payments (cash, loyalty)
        const params: DirectPaymentParams = {
          ticketId,
          amount: selectedMethod === 'cash' ? parseFloat(cashAmount) : amount,
          currency,
          paymentMethod: selectedMethod,
          metadata: {
            cashAmount: selectedMethod === 'cash' ? parseFloat(cashAmount) : undefined,
            loyaltyPoints: selectedMethod === 'loyalty' ? parseInt(loyaltyPoints) : undefined
          }
        };

        const result = await provider.processDirectPayment!(params);
        
        if (result.success) {
          onPaymentComplete({
            success: true,
            sessionId: result.sessionId,
            transactionId: result.transactionId,
            paymentMethod: selectedMethod,
            message: result.message
          });
        } else {
          setError(result.message || 'Payment failed');
        }
      } else {
        // Handle hosted payments (card)
        const checkoutResult = await provider.createCheckout({
          ticketId,
          amount,
          currency,
          paymentMethod: selectedMethod,
          metadata: {
            fromModal: true
          }
        });

        onPaymentComplete({
          success: true,
          sessionId: checkoutResult.sessionId,
          redirectUrl: checkoutResult.redirectUrl,
          expiresAt: checkoutResult.expiresAt,
          paymentMethod: selectedMethod,
          message: 'Redirecting to payment provider...'
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const validatePayment = () => {
    if (selectedMethod === 'cash') {
      const cash = parseFloat(cashAmount);
      return !isNaN(cash) && cash >= amount;
    }
    if (selectedMethod === 'loyalty') {
      const points = parseInt(loyaltyPoints);
      return !isNaN(points) && points > 0;
    }
    return true;
  };

  const isValid = validatePayment();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Payment - ${formatCurrency(amount)}`} size="md">
      <div className="space-y-4">
          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Payment Method</label>
            <div className="space-y-2">
              {filteredMethods.map(method => (
                <div
                  key={method.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedMethod === method.id
                      ? 'border-primary-600 bg-primary-100 dark:bg-primary-900/20'
                      : 'border-secondary hover:border-primary'
                  }`}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{method.icon}</span>
                    <div>
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-secondary">{method.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method Specific Fields */}
          {selectedMethod === 'cash' && (
            <div>
              <label className="block text-sm font-medium mb-2">Cash Amount</label>
              <Input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value)}
                placeholder="Enter cash amount"
                min={amount}
                step="0.01"
              />
              {parseFloat(cashAmount) < amount && (
                <p className="text-sm text-error mt-1">
                  Cash amount must be at least {formatCurrency(amount)}
                </p>
              )}
              {parseFloat(cashAmount) > amount && (
                <p className="text-sm text-success mt-1">
                  Change: {formatCurrency(parseFloat(cashAmount) - amount)}
                </p>
              )}
            </div>
          )}

          {selectedMethod === 'loyalty' && (
            <div>
              <label className="block text-sm font-medium mb-2">Loyalty Points</label>
              <Input
                type="number"
                value={loyaltyPoints}
                onChange={(e) => setLoyaltyPoints(e.target.value)}
                placeholder="Enter points to redeem"
                min="1"
              />
              <p className="text-sm text-secondary mt-1">
                Redeem your loyalty points for this purchase
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-error-50 border border-error-100 rounded-lg" role="alert" aria-live="polite">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Payment Summary */}
          <div className="border-t border-secondary pt-4">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span>Total:</span>
              <span>{formatCurrency(amount)}</span>
            </div>
            {selectedMethodConfig && (
              <p className="text-sm text-secondary mt-1">
                Payment via {selectedMethodConfig.name}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing || !isValid}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : 
               selectedMethod === 'card' ? 'Continue to Checkout' :
               selectedMethod === 'cash' ? 'Accept Cash' :
               'Redeem Points'}
            </Button>
          </div>

          {/* Dev Info */}
          <div className="text-xs text-tertiary text-center pt-2 border-t border-secondary">
            Placeholder Payment Provider
          </div>
      </div>
    </Modal>
  );
}
