import React from 'react';
import { ReportsCardGrid } from '../../components/ReportsCardGrid';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

const inventoryReportsCards = [
  {
    id: 'inventory-levels',
    title: 'Inventory Levels',
    description: 'Current stock levels, reorder points, and availability status',
    path: '/reports/inventory',
    icon: ADMIN_ICONS.items,
  },
  {
    id: 'inventory-control',
    title: 'Inventory Control',
    description: 'Stock movements, adjustments, and control reports',
    path: '/reports/inventory/control',
    icon: ADMIN_ICONS.adjustments,
    comingSoon: true,
  },
  {
    id: 'inventory-history',
    title: 'Inventory History',
    description: 'Historical stock movements and transaction logs',
    path: '/reports/inventory/history',
    icon: ADMIN_ICONS.history,
    comingSoon: true,
  },
  {
    id: 'purchase-orders',
    title: 'Purchase Orders',
    description: 'Purchase order status, delivery tracking, and vendor performance',
    path: '/reports/inventory/purchase-orders',
    icon: ADMIN_ICONS.suppliers,
    comingSoon: true,
  },
  {
    id: 'transfer-orders',
    title: 'Transfer Orders',
    description: 'Inter-location transfer requests and fulfillment status',
    path: '/reports/inventory/transfer-orders',
    icon: ADMIN_ICONS.transfers,
    comingSoon: true,
  },
  {
    id: 'transfers',
    title: 'Transfers',
    description: 'Completed transfers between locations and branches',
    path: '/reports/inventory/transfers',
    icon: ADMIN_ICONS.transfers,
    comingSoon: true,
  },
  {
    id: 'purchasing',
    title: 'Purchasing',
    description: 'Purchasing patterns, vendor analysis, and cost optimization',
    path: '/reports/inventory/purchasing',
    icon: ADMIN_ICONS.suppliers,
    comingSoon: true,
  },
  {
    id: 'cost-adjustment-history',
    title: 'Cost Adjustment History',
    description: 'Historical cost changes and adjustment tracking',
    path: '/reports/inventory/cost-adjustments',
    icon: ADMIN_ICONS.adjustments,
    comingSoon: true,
  },
];

export default function InventoryReportsLanding() {
  return (
    <div className="p-6">
      <ReportsCardGrid
        title="Inventory Reports"
        description="Comprehensive inventory management and control reporting."
        cards={inventoryReportsCards}
      />
    </div>
  );
}
