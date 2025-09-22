import { http, HttpResponse } from 'msw';
import type { OrderQuery, CreateOrderRequest, UpdateOrderStatusRequest } from './types';
import type { OrderStatus } from '../events/types';
import { createOrder, getOrderById, listOrders, updateOrderStatus } from './repository';

const VALID_ORDER_STATUSES: OrderStatus[] = ['preparing', 'ready', 'served', 'completed', 'cancelled'];

function isValidOrderStatus(status: string): status is OrderStatus {
  return VALID_ORDER_STATUSES.includes(status as OrderStatus);
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value == null) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function parseOrderQuery(url: URL): OrderQuery {
  const params = url.searchParams;
  const statusParam = params.get('status');
  let status: OrderQuery['status'] | undefined;
  if (statusParam) {
    const parts = statusParam.split(',').map(part => part.trim()).filter(isValidOrderStatus);
    status = parts.length > 1 ? parts : parts[0];
  }

  const includeCompleted = parseBoolean(params.get('includeCompleted'));
  const includeCancelled = parseBoolean(params.get('includeCancelled'));
  const from = params.get('from') ? Number(params.get('from')) : undefined;
  const to = params.get('to') ? Number(params.get('to')) : undefined;
  const limit = params.get('limit') ? Number(params.get('limit')) : undefined;

  const query: OrderQuery = {};
  if (status !== undefined) query.status = status;
  if (params.get('branchId')) query.branchId = params.get('branchId')!;
  if (includeCompleted !== undefined) query.includeCompleted = includeCompleted;
  if (includeCancelled !== undefined) query.includeCancelled = includeCancelled;
  if (from !== undefined) query.from = from;
  if (to !== undefined) query.to = to;
  if (params.get('search')) query.search = params.get('search')!;
  if (limit !== undefined) query.limit = limit;
  
  return query;
}

export const ordersApiHandlers = [
  http.get('/api/orders', async ({ request }) => {
    const url = new URL(request.url);
    const query = parseOrderQuery(url);
    // Map query to repository format
    const repoQuery: Parameters<typeof listOrders>[0] = {};
    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      repoQuery.status = statuses.map(s => (s === 'served' ? 'completed' : s)) as any[];
    }
    if (query.branchId) repoQuery.branchId = query.branchId;
    if (query.from !== undefined) repoQuery.from = query.from;
    if (query.to !== undefined) repoQuery.to = query.to;
    if (query.includeCompleted !== undefined) repoQuery.includeCompleted = query.includeCompleted;
    if (query.includeCancelled !== undefined) repoQuery.includeCancelled = query.includeCancelled;
    const orders = await listOrders(repoQuery);
    return HttpResponse.json({ orders });
  }),

  http.get('/api/orders/:id', async ({ params }) => {
    const { id } = params as Record<string, string>;
    const order = await getOrderById(id);
    if (!order) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(order);
  }),

  http.post('/api/orders', async ({ request }) => {
    const body = await request.json() as CreateOrderRequest;
    // Map CreateOrderRequest to CreateOrderInput
    const input = {
      orderType: 'dine-in' as const, // Default value
      items: body.items.map(item => ({
        id: item.id,
        name: item.name || 'Unknown Item',
        categoryId: item.categoryId || '',
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: body.totals.subtotal,
      discountAmount: body.totals.discount,
      taxAmount: body.totals.tax,
      totalAmount: body.totals.total,
      branchId: body.branchId,
      ...(body.notes && { notes: body.notes }),
      ...(body.customerId && { customer: { id: body.customerId, name: body.customerName || '' } }),
    };
    const order = await createOrder(input);
    return HttpResponse.json(order, { status: 201 });
  }),

  http.patch('/api/orders/:id', async ({ params, request }) => {
    const { id } = params as Record<string, string>;
    const body = await request.json() as UpdateOrderStatusRequest;
    // Map OrderStatus to repository status
    const mappedStatus = body.status === 'served' ? 'completed' : body.status as any;
    const order = await updateOrderStatus(id, mappedStatus);
    return HttpResponse.json(order);
  }),
];

export const ordersApi = {
  async list(query?: OrderQuery) {
    const repoQuery: Parameters<typeof listOrders>[0] = {};
    if (query?.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      repoQuery.status = statuses.map(s => (s === 'served' ? 'completed' : s)) as any[];
    }
    if (query?.branchId) repoQuery.branchId = query.branchId;
    if (query?.from !== undefined) repoQuery.from = query.from;
    if (query?.to !== undefined) repoQuery.to = query.to;
    if (query?.includeCompleted !== undefined) repoQuery.includeCompleted = query.includeCompleted;
    if (query?.includeCancelled !== undefined) repoQuery.includeCancelled = query.includeCancelled;
    const response = await listOrders(repoQuery);
    return response;
  },
  async getById(id: string) {
    return getOrderById(id);
  },
  async create(request: CreateOrderRequest) {
    const input = {
      orderType: 'dine-in' as const,
      items: request.items.map(item => ({
        id: item.id,
        name: item.name || 'Unknown Item',
        categoryId: item.categoryId || '',
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: request.totals.subtotal,
      discountAmount: request.totals.discount,
      taxAmount: request.totals.tax,
      totalAmount: request.totals.total,
      branchId: request.branchId,
      ...(request.notes && { notes: request.notes }),
      ...(request.customerId && { customer: { id: request.customerId, name: request.customerName || '' } }),
    };
    return createOrder(input);
  },
  async updateStatus(id: string, input: UpdateOrderStatusRequest) {
    const mappedStatus = input.status === 'served' ? 'completed' : input.status as any;
    return updateOrderStatus(id, mappedStatus);
  },
};




