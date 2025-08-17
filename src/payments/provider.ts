// Payment provider abstraction
export interface PaymentProvider {
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
}

export interface CheckoutParams {
  ticketId: string;
  amount: number;
  currency?: string;
}

export interface CheckoutResult {
  redirectUrl: string;
  sessionId: string;
}

// Mock hosted payment provider for development
export class MockHostedProvider implements PaymentProvider {
  private baseUrl: string;

  constructor(baseUrl = 'https://mock-payment-provider.com') {
    this.baseUrl = baseUrl;
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutResult> {
    // Generate a mock session ID
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create a mock redirect URL
    const redirectUrl = `${this.baseUrl}/checkout/${sessionId}?amount=${params.amount}&currency=${params.currency || 'USD'}&ticket=${params.ticketId}`;

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      redirectUrl,
      sessionId
    };
  }
}

// Default provider instance
export const defaultProvider = new MockHostedProvider();