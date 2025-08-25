/**
 * Cash Payment Processing
 * Handles cash transactions with change calculation
 */

import { Money, calculateChange, ZERO_USD } from '../money/Money';
import type { Event } from '../events/types';

export interface CashPaymentRequest {
  orderId: string;
  total: Money;
  tendered: Money;
}

export interface CashPaymentResult {
  success: boolean;
  paymentId: string;
  orderId: string;
  total: Money;
  tendered: Money;
  change: Money;
  timestamp: number;
  error?: string;
}

export interface CashDrawerState {
  isOpen: boolean;
  cashBalance: Money;
  lastOpenedAt?: number;
  lastClosedAt?: number;
}

/**
 * Process a cash payment
 */
export function processCashPayment(request: CashPaymentRequest): CashPaymentResult {
  const paymentId = generatePaymentId();
  const timestamp = Date.now();

  try {
    // Validate the payment
    if (request.total.isNegative() || request.total.isZero()) {
      throw new Error('Invalid payment amount');
    }

    if (request.tendered.isNegative()) {
      throw new Error('Invalid tendered amount');
    }

    // Calculate change
    const change = calculateChange(request.tendered, request.total);

    return {
      success: true,
      paymentId,
      orderId: request.orderId,
      total: request.total,
      tendered: request.tendered,
      change,
      timestamp
    };
  } catch (error) {
    return {
      success: false,
      paymentId,
      orderId: request.orderId,
      total: request.total,
      tendered: request.tendered,
      change: ZERO_USD,
      timestamp,
      error: error instanceof Error ? error.message : 'Payment processing failed'
    };
  }
}

/**
 * Create a cash payment event
 */
export function createCashPaymentEvent(result: CashPaymentResult): Partial<Event> {
  return {
    type: result.success ? 'CashPaymentProcessed' : 'CashPaymentFailed',
    payload: {
      paymentId: result.paymentId,
      orderId: result.orderId,
      total: result.total.toJSON(),
      tendered: result.tendered.toJSON(),
      change: result.change.toJSON(),
      error: result.error
    },
    aggregate: {
      id: result.orderId,
      type: 'order'
    }
  };
}

/**
 * Open cash drawer
 */
export function openCashDrawer(currentState: CashDrawerState): CashDrawerState {
  if (currentState.isOpen) {
    console.warn('Cash drawer is already open');
    return currentState;
  }

  return {
    ...currentState,
    isOpen: true,
    lastOpenedAt: Date.now()
  };
}

/**
 * Close cash drawer
 */
export function closeCashDrawer(currentState: CashDrawerState): CashDrawerState {
  if (!currentState.isOpen) {
    console.warn('Cash drawer is already closed');
    return currentState;
  }

  return {
    ...currentState,
    isOpen: false,
    lastClosedAt: Date.now()
  };
}

/**
 * Add cash to drawer
 */
export function addCashToDrawer(
  currentState: CashDrawerState,
  amount: Money
): CashDrawerState {
  if (!currentState.isOpen) {
    throw new Error('Cannot add cash to closed drawer');
  }

  return {
    ...currentState,
    cashBalance: currentState.cashBalance.add(amount)
  };
}

/**
 * Remove cash from drawer
 */
export function removeCashFromDrawer(
  currentState: CashDrawerState,
  amount: Money
): CashDrawerState {
  if (!currentState.isOpen) {
    throw new Error('Cannot remove cash from closed drawer');
  }

  if (currentState.cashBalance.lessThan(amount)) {
    throw new Error('Insufficient cash in drawer');
  }

  return {
    ...currentState,
    cashBalance: currentState.cashBalance.subtract(amount)
  };
}

/**
 * Process cash payment and update drawer
 */
export function processCashPaymentWithDrawer(
  request: CashPaymentRequest,
  drawerState: CashDrawerState
): {
  paymentResult: CashPaymentResult;
  newDrawerState: CashDrawerState;
} {
  const paymentResult = processCashPayment(request);

  if (!paymentResult.success) {
    return { paymentResult, newDrawerState: drawerState };
  }

  // Open drawer if needed
  let newDrawerState = drawerState.isOpen ? drawerState : openCashDrawer(drawerState);

  // Add the payment amount to drawer
  newDrawerState = addCashToDrawer(newDrawerState, request.total);

  // If there's change, remove it from drawer
  if (paymentResult.change.isPositive()) {
    try {
      newDrawerState = removeCashFromDrawer(newDrawerState, paymentResult.change);
    } catch (error) {
      // If insufficient change in drawer, fail the payment
      return {
        paymentResult: {
          ...paymentResult,
          success: false,
          error: 'Insufficient change in drawer'
        },
        newDrawerState: drawerState
      };
    }
  }

  return { paymentResult, newDrawerState };
}

/**
 * Calculate denominations for change
 */
export function calculateChangeDenominations(change: Money): Map<number, number> {
  const denominations = new Map<number, number>();
  const bills = [10000, 5000, 2000, 1000, 500, 100]; // in cents
  const coins = [25, 10, 5, 1]; // in cents
  
  let remaining = change.toCents();

  // Calculate bills
  for (const bill of bills) {
    if (remaining >= bill) {
      const count = Math.floor(remaining / bill);
      denominations.set(bill, count);
      remaining -= count * bill;
    }
  }

  // Calculate coins
  for (const coin of coins) {
    if (remaining >= coin) {
      const count = Math.floor(remaining / coin);
      denominations.set(coin, count);
      remaining -= count * coin;
    }
  }

  return denominations;
}

/**
 * Format denominations for display
 */
export function formatDenominations(denominations: Map<number, number>): string[] {
  const result: string[] = [];
  
  denominations.forEach((count, value) => {
    if (count > 0) {
      if (value >= 100) {
        const dollars = value / 100;
        result.push(`${count} x $${dollars}`);
      } else {
        result.push(`${count} x ${value}¢`);
      }
    }
  });

  return result;
}

/**
 * Generate a unique payment ID
 */
function generatePaymentId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize cash drawer state
 */
export function initializeCashDrawer(initialBalance: Money = ZERO_USD): CashDrawerState {
  return {
    isOpen: false,
    cashBalance: initialBalance,
    lastOpenedAt: undefined,
    lastClosedAt: undefined
  };
}

/**
 * Cash drawer reconciliation
 */
export interface CashReconciliation {
  expectedBalance: Money;
  actualBalance: Money;
  difference: Money;
  isBalanced: boolean;
  timestamp: number;
}

/**
 * Reconcile cash drawer
 */
export function reconcileCashDrawer(
  expectedBalance: Money,
  actualBalance: Money
): CashReconciliation {
  const difference = actualBalance.subtract(expectedBalance);
  
  return {
    expectedBalance,
    actualBalance,
    difference,
    isBalanced: difference.isZero(),
    timestamp: Date.now()
  };
}

/**
 * Create cash reconciliation event
 */
export function createCashReconciliationEvent(reconciliation: CashReconciliation): Partial<Event> {
  return {
    type: reconciliation.isBalanced ? 'CashDrawerBalanced' : 'CashDrawerDiscrepancy',
    payload: {
      expectedBalance: reconciliation.expectedBalance.toJSON(),
      actualBalance: reconciliation.actualBalance.toJSON(),
      difference: reconciliation.difference.toJSON(),
      timestamp: reconciliation.timestamp
    },
    aggregate: {
      id: 'cash-drawer',
      type: 'drawer'
    }
  };
}
