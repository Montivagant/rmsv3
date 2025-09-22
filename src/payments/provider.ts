// Payment provider abstraction
export interface PaymentProvider {
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  processDirectPayment?(params: DirectPaymentParams): Promise<DirectPaymentResult>;
}

export interface CheckoutParams {
  ticketId: string;
  amount: number;
  currency?: string;
  paymentMethod?: 'card' | 'cash' | 'loyalty';
  metadata?: Record<string, any>;
}

export interface CheckoutResult {
  redirectUrl: string;
  sessionId: string;
  expiresAt: Date;
}

export interface DirectPaymentParams {
  ticketId: string;
  amount: number;
  currency?: string;
  paymentMethod: 'cash' | 'loyalty';
  metadata?: Record<string, any>;
}

export interface DirectPaymentResult {
  success: boolean;
  sessionId: string;
  transactionId: string;
  message?: string;
}

export interface PaymentConfig {
  mode: 'placeholder' | 'stripe' | 'square' | 'paypal';
  enableCash: boolean;
  enableLoyalty: boolean;
  autoSuccessRate: number; // 0-1, for placeholder mode
  simulateLatency: boolean;
  minLatency: number; // ms
  maxLatency: number; // ms
}

// Enhanced placeholder payment provider for development
export class PlaceholderPaymentProvider implements PaymentProvider {
  private baseUrl: string;
  private config: PaymentConfig;

  constructor(config: Partial<PaymentConfig> = {}) {
    this.baseUrl = 'https://placeholder-payments.dev';
    this.config = {
      mode: 'placeholder',
      enableCash: true,
      enableLoyalty: true,
      autoSuccessRate: 0.85, // 85% success rate for realism
      simulateLatency: true,
      minLatency: 500,
      maxLatency: 2000,
      ...config
    };
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    // Simulate realistic network latency
    if (this.config.simulateLatency) {
      const delay = Math.random() * (this.config.maxLatency - this.config.minLatency) + this.config.minLatency;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Generate a realistic session ID
    const sessionId = `sess_${params.paymentMethod || 'card'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create a mock redirect URL with realistic parameters
    const urlParams = new URLSearchParams({
      amount: params.amount.toString(),
      currency: params.currency || 'USD',
      ticket: params.ticketId,
      method: params.paymentMethod || 'card',
      ...(params.metadata || {})
    });
    
    const redirectUrl = `${this.baseUrl}/checkout/${sessionId}?${urlParams.toString()}`;
    
    // Session expires in 15 minutes (realistic for payment sessions)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    return {
      redirectUrl,
      sessionId,
      expiresAt
    };
  }

  async processDirectPayment(params: DirectPaymentParams): Promise<DirectPaymentResult> {
    // Simulate processing time
    if (this.config.simulateLatency) {
      const delay = Math.random() * 1000 + 300; // 300-1300ms for direct payments
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const sessionId = `direct_${params.paymentMethod}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

    // Simulate some failures for realism
    const shouldSucceed = Math.random() < this.config.autoSuccessRate;
    
    if (!shouldSucceed && params.paymentMethod === 'cash') {
      return {
        success: false,
        sessionId,
        transactionId,
        message: 'Insufficient cash provided'
      };
    }

    if (!shouldSucceed && params.paymentMethod === 'loyalty') {
      return {
        success: false,
        sessionId,
        transactionId,
        message: 'Insufficient loyalty points'
      };
    }

    return {
      success: true,
      sessionId,
      transactionId,
      message: `${params.paymentMethod === 'cash' ? 'Cash' : 'Loyalty points'} payment processed successfully`
    };
  }

  // Configure the provider
  updateConfig(newConfig: Partial<PaymentConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): PaymentConfig {
    return { ...this.config };
  }

  // Simulate webhook events for hosted payments
  async simulateWebhookEvent(sessionId: string, eventType: 'succeeded' | 'failed' | 'expired', delay = 2000): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        console.log(`[Placeholder] Simulated webhook: ${sessionId} -> ${eventType}`);
        // In real implementation, this would trigger actual webhook handling
        resolve();
      }, delay);
    });
  }
}

// Enhanced mock for Stripe-like hosted payments
export class MockStripeProvider implements PaymentProvider {
  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    const sessionId = `cs_live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate Stripe checkout session creation
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Build redirect URL with params
    const urlParams = new URLSearchParams({
      amount: params.amount.toString(),
      currency: params.currency || 'USD',
      ticket: params.ticketId,
      ...(params.metadata && { metadata: JSON.stringify(params.metadata) })
    });
    
    return {
      redirectUrl: `https://checkout.stripe.com/pay/${sessionId}?${urlParams.toString()}`,
      sessionId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }
}

// Configuration-based provider factory
export function createPaymentProvider(config?: Partial<PaymentConfig>): PaymentProvider {
  const finalConfig = {
    mode: 'placeholder' as const,
    enableCash: true,
    enableLoyalty: true,
    autoSuccessRate: 0.85,
    simulateLatency: true,
    minLatency: 500,
    maxLatency: 2000,
    ...config
  };

  switch (finalConfig.mode) {
    case 'stripe':
      return new MockStripeProvider();
    case 'placeholder':
    default:
      return new PlaceholderPaymentProvider(finalConfig);
  }
}

// Default provider instance with realistic settings
export const defaultProvider = createPaymentProvider({
  mode: 'placeholder',
  autoSuccessRate: 0.9, // 90% success rate for development
  simulateLatency: true,
  minLatency: 300,
  maxLatency: 1500
});