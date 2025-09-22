/**
 * Orders Repository
 * 
 * Manages order data by processing events from the event store.
 * Handles order creation, updates, completion, and cancellation.
 */

import { bootstrapEventStore } from '../bootstrap/persist';
import { logger } from '../shared/logger';
import type { OrderQuery, OrderState, OrderItem, OrderSource } from './types';

interface InternalOrderState extends OrderState {
  orderType?: 'dine-in' | 'takeout' | 'delivery';
  deleted?: boolean;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed';
  totalAmount?: number;
  orderNumber?: string;
}

export interface OrderCustomer {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

// Event type definitions for order events
interface OrderCreatedEvent {
  type: 'order.created.v1' | 'order.created';
  payload: {
    orderId: string;
    orderNumber: string;
    orderType: 'dine-in' | 'takeout' | 'delivery';
    items: OrderItem[];
    subtotal: number;
    discountAmount?: number;
    discountReason?: string;
    taxAmount: number;
    totalAmount: number;
    customer?: OrderCustomer;
    branchId: string;
    branchName?: string;
    tableNumber?: string;
    createdBy: string;
    notes?: string;
    specialRequests?: string;
    estimatedReadyTime?: number;
  };
}

interface OrderStatusUpdatedEvent {
  type: 'order.status.updated.v1' | 'order.status.updated';
  payload: {
    orderId: string;
    status: OrderState['status'];
    updatedBy: string;
    notes?: string;
  };
}

interface OrderCompletedEvent {
  type: 'order.completed.v1' | 'order.completed';
  payload: {
    orderId: string;
    completedBy: string;
    completedAt: number;
    paymentMethod?: string;
  };
}

interface OrderCancelledEvent {
  type: 'order.cancelled.v1' | 'order.cancelled';
  payload: {
    orderId: string;
    cancelledBy: string;
    cancelledAt: number;
    reason?: string;
  };
}

interface PaymentProcessedEvent {
  type: 'payment.processed.v1' | 'payment.processed';
  payload: {
    orderId: string;
    amount: number;
    paymentMethod: string;
    processedBy: string;
    transactionId?: string;
  };
}

function ensureOrderState(map: Map<string, InternalOrderState>, orderId: string): InternalOrderState {
  const existing = map.get(orderId);
  if (existing) return existing;
  
  // Create a fallback order state
  const fallback: InternalOrderState = {
    id: orderId,
    ticketId: `ORD-${orderId.slice(-8)}`,
    status: 'preparing',
    orderType: 'dine-in',
    items: [],
    totals: {
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0
    },
    branchId: 'main',
    source: 'POS',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    paymentStatus: 'pending',
    deleted: false
  };
  
  map.set(orderId, fallback);
  return fallback;
}

async function loadOrdersMap(): Promise<Map<string, InternalOrderState>> {
  const { store } = await bootstrapEventStore();
  const events: any[] = store.getAll(); // TODO: type this from EventStore
  const map = new Map<string, InternalOrderState>();
  
  for (const event of events) {
    // Handle order created events
    if (event.type === 'order.created.v1' || event.type === 'order.created') {
      const payload = (event as OrderCreatedEvent).payload;
      const state: InternalOrderState = {
        id: payload.orderId,
        ticketId: payload.orderNumber,
        status: 'preparing',
        orderType: payload.orderType,
        items: payload.items,
        totals: {
          subtotal: payload.subtotal,
          discount: payload.discountAmount || 0,
          tax: payload.taxAmount,
          total: payload.totalAmount
        },
        branchId: payload.branchId,
        source: 'pos' as OrderSource,
        createdAt: event.at,
        updatedAt: event.at,
        paymentStatus: 'pending',
        ...(payload.notes && { notes: payload.notes }),
        ...(payload.customer && { 
          customerId: payload.customer.id,
          customerName: payload.customer.name
        }),
        deleted: false,
        totalAmount: payload.totalAmount
      };
      map.set(payload.orderId, state);
      continue;
    }
    
    // Handle order status updates
    if (event.type === 'order.status.updated.v1' || event.type === 'order.status.updated') {
      const payload = (event as OrderStatusUpdatedEvent).payload;
      const record = ensureOrderState(map, payload.orderId);
      record.status = payload.status;
      record.updatedAt = event.at;
      if (payload.notes) {
        record.notes = payload.notes;
      }
      continue;
    }
    
    // Handle order completed events
    if (event.type === 'order.completed.v1' || event.type === 'order.completed') {
      const payload = (event as OrderCompletedEvent).payload;
      const record = ensureOrderState(map, payload.orderId);
      record.status = 'completed';
      record.completedAt = payload.completedAt;
      record.updatedAt = event.at;
      if (payload.paymentMethod) {
        record.paymentMethod = payload.paymentMethod;
        record.paymentStatus = 'paid';
      }
      continue;
    }
    
    // Handle order cancelled events
    if (event.type === 'order.cancelled.v1' || event.type === 'order.cancelled') {
      const payload = (event as OrderCancelledEvent).payload;
      const record = ensureOrderState(map, payload.orderId);
      record.status = 'cancelled';
      record.cancelledAt = payload.cancelledAt;
      record.updatedAt = event.at;
      continue;
    }
    
    // Handle payment processed events
    if (event.type === 'payment.processed.v1' || event.type === 'payment.processed') {
      const payload = (event as PaymentProcessedEvent).payload;
      const record = map.get(payload.orderId);
      if (record) {
        record.paymentStatus = 'paid';
        record.paymentMethod = payload.paymentMethod;
        record.updatedAt = event.at;
      }
      continue;
    }
  }
  
  return map;
}

export async function listOrders(filters: OrderQuery = {}): Promise<OrderState[]> {
  const map = await loadOrdersMap();
  const orders = Array.from(map.values()).filter(order => !order.deleted);
  
  let filtered = orders;
  
  // Filter by status
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    filtered = filtered.filter(order => statuses.includes(order.status));
  }
  
  // Filter by order type (internal state only)
  if ('orderType' in filters && (filters as any).orderType) {
    filtered = filtered.filter(order => (order as InternalOrderState).orderType === (filters as any).orderType);
  }
  
  // Filter by branch
  if (filters.branchId) {
    filtered = filtered.filter(order => order.branchId === filters.branchId);
  }
  
  // Filter by date range
  if (filters.from) {
    filtered = filtered.filter(order => order.createdAt >= filters.from!);
  }
  if (filters.to) {
    filtered = filtered.filter(order => order.createdAt <= filters.to!);
  }
  
  // Exclude completed/cancelled if specified
  if (filters.includeCompleted === false) {
    filtered = filtered.filter(order => order.status !== 'completed');
  }
  if (filters.includeCancelled === false) {
    filtered = filtered.filter(order => order.status !== 'cancelled');
  }
  
  // Sort by creation time (most recent first)
  const sorted = filtered.sort((a, b) => b.createdAt - a.createdAt);
  
  // Convert InternalOrderState to OrderState by omitting internal properties
  return sorted.map(order => {
    const { orderType, deleted, paymentMethod, paymentStatus, totalAmount, ...orderState } = order;
    return orderState;
  });
}

export async function getActiveOrders(): Promise<OrderState[]> {
  return listOrders({
    status: ['preparing', 'ready'],
    includeCompleted: false,
    includeCancelled: false
  });
}

export async function getOrderById(orderId: string): Promise<OrderState | null> {
  const map = await loadOrdersMap();
  const order = map.get(orderId);
  if (!order || order.deleted) return null;
  
  // Convert InternalOrderState to OrderState by omitting internal properties
  const { orderType, deleted, paymentMethod, paymentStatus, totalAmount, ...orderState } = order;
  return orderState;
}

export interface CreateOrderInput {
  orderNumber?: string;
  orderType: 'dine-in' | 'takeout' | 'delivery';
  items: OrderItem[];
  subtotal: number;
  discountAmount?: number;
  discountReason?: string;
  taxAmount: number;
  totalAmount: number;
  customer?: OrderCustomer;
  branchId?: string;
  branchName?: string;
  tableNumber?: string;
  notes?: string;
  specialRequests?: string;
  estimatedReadyTime?: number;
}

export async function createOrder(input: CreateOrderInput): Promise<OrderState> {
  const { store } = await bootstrapEventStore();
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const orderNumber = input.orderNumber || `ORD-${Date.now().toString().slice(-6)}`;
  const createdBy = 'current-user'; // TODO: Get from auth context
  
  const payload: OrderCreatedEvent['payload'] = {
    orderId,
    orderNumber,
    orderType: input.orderType,
    items: input.items,
    subtotal: input.subtotal,
    discountAmount: input.discountAmount || 0,
    taxAmount: input.taxAmount,
    totalAmount: input.totalAmount,
    branchId: input.branchId || 'main',
    createdBy,
    ...(input.discountReason && { discountReason: input.discountReason }),
    ...(input.customer && { customer: input.customer }),
    ...(input.branchName && { branchName: input.branchName }),
    ...(input.tableNumber && { tableNumber: input.tableNumber }),
    ...(input.notes && { notes: input.notes }),
    ...(input.specialRequests && { specialRequests: input.specialRequests }),
    ...(input.estimatedReadyTime && { estimatedReadyTime: input.estimatedReadyTime })
  };

  const result = store.append('order.created.v1', payload, {
    key: `create-order-${orderId}`,
    params: input,
    aggregate: { id: orderId, type: 'order' }
  });
  
  logger.info('Order created', { orderId, orderNumber, totalAmount: input.totalAmount });
  
  return {
    id: orderId,
    ticketId: orderNumber,
    status: 'preparing',
    items: input.items,
    totals: {
      subtotal: input.subtotal,
      discount: input.discountAmount || 0,
      tax: input.taxAmount,
      total: input.totalAmount
    },
    branchId: input.branchId || 'main',
    source: 'pos' as OrderSource,
    createdAt: result.event.at,
    updatedAt: result.event.at,
    ...(input.notes && { notes: input.notes }),
    ...(input.customer && { 
      customerId: input.customer.id,
      customerName: input.customer.name 
    })
  };
}

export async function updateOrderStatus(id: string, status: OrderState['status']): Promise<OrderState | null> {
  const existing = await getOrderById(id);
  if (!existing) return null;
  
  const { store } = await bootstrapEventStore();
  const updatedBy = 'current-user'; // TODO: Get from auth context
  
  store.append('order.status.updated.v1', {
    orderId: id,
    status,
    updatedBy,
    notes: existing.notes
  }, {
    key: `update-order-status-${id}-${status}`,
    params: { orderId: id, status, notes: existing.notes },
    aggregate: { id: id, type: 'order' }
  });
  
  logger.info('Order status updated', { orderId: id, status, previousStatus: existing.status });
  
  const order = await getOrderById(id);
  if (!order) return null;

  return {
    ...order,
    status,
    updatedAt: Date.now(),
    ...(status === 'completed' && { completedAt: Date.now() }),
    ...(status === 'cancelled' && { cancelledAt: Date.now() })
  };
}

export async function completeOrder(id: string, paymentMethod: string): Promise<OrderState | null> {
  const existing = await getOrderById(id);
  if (!existing) return null;
  
  const { store } = await bootstrapEventStore();
  const completedBy = 'current-user'; // TODO: Get from auth context
  const completedAt = Date.now();
  
  store.append('order.completed.v1', {
    orderId: id,
    completedBy,
    completedAt,
    paymentMethod
  }, {
    key: `complete-order-${id}`,
    params: { orderId: id, paymentMethod },
    aggregate: { id: id, type: 'order' }
  });
  
  logger.info('Order completed', { orderId: id, paymentMethod, totalAmount: existing.totals.total });
  
  return updateOrderStatus(id, 'completed');
}

export async function cancelOrder(id: string, reason: string): Promise<OrderState | null> {
  const existing = await getOrderById(id);
  if (!existing) return null;
  
  const { store } = await bootstrapEventStore();
  const cancelledBy = 'current-user'; // TODO: Get from auth context
  const cancelledAt = Date.now();
  
  store.append('order.cancelled.v1', {
    orderId: id,
    cancelledBy,
    cancelledAt,
    reason
  }, {
    key: `cancel-order-${id}`,
    params: { orderId: id, reason },
    aggregate: { id: id, type: 'order' }
  });
  
  logger.info('Order cancelled', { orderId: id, reason, totalAmount: existing.totals.total });
  
  return updateOrderStatus(id, 'cancelled');
}

// Helper functions for order management
export function calculateOrderTotals(items: OrderItem[], discountAmount: number = 0, taxRate: number = 0.14): {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
} {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100;
  const totalAmount = subtotal - discountAmount + taxAmount;
  
  return {
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount
  };
}

export function formatOrderNumber(orderId: string, timestamp?: number): string {
  const time = timestamp || Date.now();
  const datePart = new Date(time).toISOString().slice(0, 10).replace(/-/g, '');
  const idPart = orderId.slice(-4).toUpperCase();
  return `ORD-${datePart}-${idPart}`;
}