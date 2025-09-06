import React from 'react';
import { PageStub } from '../../components/PageStub';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

export default function PurchaseOrdersNew() {
  return (
    <PageStub
      title="Purchase Orders"
      description="Create and manage purchase orders for inventory replenishment."
      icon={ADMIN_ICONS.orders}
      backPath="/inventory"
      backLabel="Back to Inventory"
      comingSoon={false}
      features={[
        'Create purchase orders for suppliers',
        'Track order status and delivery',
        'Manage purchase order approvals',
        'Receive ordered items and update stock',
        'Handle partial deliveries and backorders',
        'Generate purchase order reports',
        'Automated reordering based on stock levels'
      ]}
    />
  );
}
