import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { Label } from './Label';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentComplete: (result: PaymentResult) => void;
  amount: number;
  currency: string;
  ticketId: string;
  provider: any;
  availableMethods: string[];
}

interface PaymentResult {
  success: boolean;
  paymentMethod: string;
  sessionId: string;
  redirectUrl?: string;
}

export function PaymentModal({
  isOpen,
  onClose,
  onPaymentComplete,
  amount,
  currency,
  ticketId,
  availableMethods = ['card', 'cash']
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState(availableMethods[0] || 'card');
  const [cashReceived, setCashReceived] = useState(amount);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result: PaymentResult = {
        success: true,
        paymentMethod: selectedMethod,
        sessionId: `session_${Date.now()}`,
        ...(selectedMethod === 'card' && {
          redirectUrl: `https://payment-gateway.example.com/pay/${ticketId}`
        })
      };
      
      onPaymentComplete(result);
    } catch (error) {
      console.error('Payment failed:', error);
      onPaymentComplete({
        success: false,
        paymentMethod: selectedMethod,
        sessionId: `failed_${Date.now()}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const change = selectedMethod === 'cash' ? Math.max(0, cashReceived - amount) : 0;
  const canProceed = selectedMethod !== 'cash' || cashReceived >= amount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Payment"
      size="sm"
    >
      <div className="space-y-6">
        {/* Amount Summary */}
        <div className="bg-surface-secondary rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Total Amount:</span>
            <span className="text-xl font-bold text-text-primary">
              {currency} {amount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <Label htmlFor="payment-method">Payment Method</Label>
          <Select
            id="payment-method"
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="mt-1"
          >
            {availableMethods.map(method => (
              <option key={method} value={method}>
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </option>
            ))}
          </Select>
        </div>

        {/* Cash Payment Fields */}
        {selectedMethod === 'cash' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cash-received">Cash Received</Label>
              <Input
                id="cash-received"
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                min={0}
                step={0.01}
                className="mt-1"
              />
            </div>
            
            {change > 0 && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-success font-medium">Change Due:</span>
                  <span className="text-success font-bold">
                    {currency} {change.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            
            {cashReceived < amount && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                <span className="text-warning text-sm">
                  Insufficient cash received. Need {currency} {(amount - cashReceived).toFixed(2)} more.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Loyalty Payment Info */}
        {selectedMethod === 'loyalty' && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <p className="text-primary text-sm">
              This payment will be processed using loyalty points.
            </p>
          </div>
        )}

        {/* Card Payment Info */}
        {selectedMethod === 'card' && (
          <div className="bg-info/10 border border-info/20 rounded-lg p-3">
            <p className="text-info text-sm">
              You will be redirected to the payment gateway to complete the transaction.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handlePayment}
            disabled={!canProceed || isProcessing}
            loading={isProcessing}
            className="flex-1"
          >
            {selectedMethod === 'card' ? 'Proceed to Gateway' : 'Process Payment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
