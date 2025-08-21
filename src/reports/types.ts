export interface ZReportData {
  reportId: string;
  reportNumber: number; // Sequential: Z001, Z002, etc.
  businessDate: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  operatorId: string;
  operatorName: string;
  
  // Sales Summary
  salesSummary: {
    grossSales: number;
    totalDiscounts: number;
    netSales: number;
    totalTax: number;
    finalTotal: number;
    transactionCount: number;
    itemCount: number;
    averageTicket: number;
  };
  
  // Payment Breakdown
  paymentSummary: {
    cash: { count: number; amount: number };
    card: { count: number; amount: number };
    other: { count: number; amount: number };
    total: { count: number; amount: number };
  };
  
  // Tax Breakdown
  taxSummary: Array<{
    rate: number;
    taxableAmount: number;
    taxAmount: number;
  }>;
  
  // Top Items
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  
  // Discount Summary
  discountSummary: {
    totalDiscounts: number;
    discountCount: number;
    loyaltyDiscounts: number;
    manualDiscounts: number;
  };
  
  // Status
  status: 'draft' | 'finalized';
  finalizedAt?: string;
  finalizedBy?: string;
}

export interface CashReconciliation {
  expectedCash: number;
  actualCash: number;
  variance: number;
  notes?: string;
}

export interface ZReportRequest {
  businessDate: string;
  operatorId: string;
  operatorName: string;
  cashReconciliation?: CashReconciliation;
}
