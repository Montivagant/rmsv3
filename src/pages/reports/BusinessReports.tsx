import React from 'react';
import { ReportsCardGrid } from '../../components/ReportsCardGrid';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

const businessReportsCards = [
  {
    id: 'taxes',
    title: 'Taxes',
    description: 'Tax collection reports by jurisdiction and rate for compliance',
    path: '/reports/business/taxes',
    icon: ADMIN_ICONS.reports,
  },
  {
    id: 'tips',
    title: 'Tips',
    description: 'Staff tip allocation and distribution reports',
    path: '/reports/business/tips',
    icon: ADMIN_ICONS.users,
  },
  {
    id: 'gift-cards',
    title: 'Gift Cards',
    description: 'Gift card sales, redemptions, and outstanding balances',
    path: '/reports/business/gift-cards',
    icon: ADMIN_ICONS.giftCards,
  },
  {
    id: 'business-days',
    title: 'Business Days',
    description: 'Daily business summaries and closing reports',
    path: '/reports/business/business-days',
    icon: ADMIN_ICONS.reports,
  },
  {
    id: 'shifts',
    title: 'Shifts',
    description: 'Staff shift reports and labor cost analysis',
    path: '/reports/business/shifts',
    icon: ADMIN_ICONS.users,
  },
  {
    id: 'tills',
    title: 'Tills',
    description: 'Till reconciliation and cash management reports',
    path: '/reports/business/tills',
    icon: ADMIN_ICONS.orders,
  },
  {
    id: 'drawer-operations',
    title: 'Drawer Operations',
    description: 'Cash drawer open/close operations and audit trail',
    path: '/reports/business/drawer-operations',
    icon: ADMIN_ICONS.history,
  },
  {
    id: 'voids-returns',
    title: 'Voids & Returns',
    description: 'Voided transactions and return processing reports',
    path: '/reports/business/voids-returns',
    icon: ADMIN_ICONS.adjustments,
  },
  {
    id: 'activity-log',
    title: 'Activity Log',
    description: 'System activity and user action audit logs',
    path: '/reports/business/activity-log',
    icon: ADMIN_ICONS.history,
  },
];

export default function BusinessReports() {
  return (
    <div className="p-6">
      <ReportsCardGrid
        title="Business Reports"
        description="Comprehensive business operations and compliance reporting tools."
        cards={businessReportsCards}
      />
    </div>
  );
}
