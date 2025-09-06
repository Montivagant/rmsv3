import React from 'react';
import { ReportsCardGrid } from '../../components/ReportsCardGrid';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

const salesReportsCards = [
  {
    id: 'sales-reports',
    title: 'Sales Reports',
    description: 'Comprehensive sales performance and revenue analysis',
    path: '/reports/sales',
    icon: ADMIN_ICONS.reports,
  },
  {
    id: 'payment-reports',
    title: 'Payment Reports',
    description: 'Payment method breakdown and transaction analysis',
    path: '/reports/payments',
    icon: ADMIN_ICONS.orders,
    comingSoon: true,
  },
];

export default function SalesReportsLanding() {
  return (
    <div className="p-6">
      <ReportsCardGrid
        title="Sales Reports"
        description="Sales performance and payment analysis tools."
        cards={salesReportsCards}
      />
    </div>
  );
}
