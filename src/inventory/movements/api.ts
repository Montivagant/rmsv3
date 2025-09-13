import { http, HttpResponse } from 'msw';

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  type: 'sale' | 'adjustment' | 'transfer' | 'audit' | 'waste' | 'received';
  quantity: number;
  unit: string;
  cost?: number;
  reason?: string;
  reference?: string;
  userId: string;
  userName: string;
  branchId: string;
  branchName: string;
  createdAt: string;
}

// Simple in-memory movements for demo
const seedNow = Date.now();
const mockMovements: InventoryMovement[] = [
  {
    id: 'mv_1',
    itemId: 'BURGER_BUNS',
    itemName: 'Hamburger Buns',
    itemSku: 'BURGER_BUNS',
    type: 'received',
    quantity: 50,
    unit: 'pieces',
    cost: 0.3,
    reference: 'PO-1001',
    userId: 'user_1',
    userName: 'Admin User',
    branchId: 'main-restaurant',
    branchName: 'Main Restaurant',
    createdAt: new Date(seedNow - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'mv_2',
    itemId: 'BEEF_PATTY',
    itemName: 'Beef Patty (1/4 lb)',
    itemSku: 'BEEF_PATTY',
    type: 'sale',
    quantity: -4,
    unit: 'pieces',
    cost: 2.45,
    reference: 'T-12345',
    userId: 'user_1',
    userName: 'Admin User',
    branchId: 'main-restaurant',
    branchName: 'Main Restaurant',
    createdAt: new Date(seedNow - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'mv_3',
    itemId: 'FRIES_FROZEN',
    itemName: 'Frozen French Fries',
    itemSku: 'FRIES_FROZEN',
    type: 'transfer',
    quantity: -10,
    unit: 'lbs',
    cost: 1.25,
    reference: 'TRF-123',
    userId: 'user_2',
    userName: 'Restaurant Manager',
    branchId: 'main-restaurant',
    branchName: 'Main Restaurant',
    createdAt: new Date(seedNow - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'mv_4',
    itemId: 'FRIES_FROZEN',
    itemName: 'Frozen French Fries',
    itemSku: 'FRIES_FROZEN',
    type: 'transfer',
    quantity: 10,
    unit: 'lbs',
    cost: 1.25,
    reference: 'TRF-123',
    userId: 'user_2',
    userName: 'Restaurant Manager',
    branchId: 'downtown-location',
    branchName: 'Downtown Location',
    createdAt: new Date(seedNow - 1000 * 60 * 40).toISOString(),
  },
];

export const inventoryMovementsApiHandlers = [
  http.get('/api/inventory/movements', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const type = url.searchParams.get('type') || '';
    const branchId = url.searchParams.get('branchId') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10);

    let rows = [...mockMovements];
    if (search) {
      rows = rows.filter(r =>
        r.itemName.toLowerCase().includes(search) ||
        r.itemSku.toLowerCase().includes(search) ||
        (r.reference || '').toLowerCase().includes(search)
      );
    }
    if (type) rows = rows.filter(r => r.type === (type as any));
    if (branchId) rows = rows.filter(r => r.branchId === branchId);

    const total = rows.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const paged = rows.slice(start, end);
    return HttpResponse.json({ movements: paged, total, page, pageSize });
  }),
];


