import type { OrderStatus } from '../events/types';

export interface OrderItem {
  id: string;
  name?: string;
  categoryId?: string;
  quantity: number;
  price: number;
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export type OrderSource = 'POS' | 'ONLINE' | 'PHONE' | string;

export interface CreateOrderRequest {
  orderId: string;
  ticketId: string;
  branchId: string;
  source: OrderSource;
  status?: OrderStatus;
  items: OrderItem[];
  totals: OrderTotals;
  customerId?: string;
  customerName?: string;
  notes?: string;
  channel?: string;
  createdAt?: number;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  actorId?: string;
  actorName?: string;
  reason?: string;
  updatedAt?: number;
}

export interface OrderState {
  id: string;
  ticketId: string;
  branchId: string;
  source: OrderSource;
  status: OrderStatus;
  items: OrderItem[];
  totals: OrderTotals;
  customerId?: string;
  customerName?: string;
  notes?: string;
  channel?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  cancelledAt?: number;
}

export interface OrderQuery {
  status?: OrderStatus | OrderStatus[] | undefined;
  branchId?: string | undefined;
  includeCompleted?: boolean | undefined;
  includeCancelled?: boolean | undefined;
  from?: number | undefined;
  to?: number | undefined;
  dateFrom?: string;
  dateTo?: string;
  search?: string | undefined;
  limit?: number | undefined;
}

export interface OrderMetrics {
  totalOrders: number;
  totalActive: number;
  totalRevenue: number;
  totalDiscounts: number;
  averageOrderValue: number;
}
