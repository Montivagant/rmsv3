import React from 'react';
import { ReportsCardGrid } from '../../components/ReportsCardGrid';
import { ADMIN_ICONS } from '../../config/admin-nav.config';

const analysisReportsCards = [
  {
    id: 'menu-engineering',
    title: 'Menu Engineering',
    description: 'Menu item performance analysis and optimization recommendations',
    path: '/reports/analysis/menu-engineering',
    icon: ADMIN_ICONS.menu,
  },
  {
    id: 'inventory-cost-analysis',
    title: 'Inventory Cost Analysis',
    description: 'Cost analysis and variance reporting for inventory items',
    path: '/reports/analysis/inventory-cost',
    icon: ADMIN_ICONS.inventory,
  },
  {
    id: 'branches-trend',
    title: 'Branches Trend',
    description: 'Multi-location performance trends and comparative analysis',
    path: '/reports/analysis/branches-trend',
    icon: ADMIN_ICONS.branches,
    comingSoon: true,
  },
  {
    id: 'product-cost',
    title: 'Product Cost',
    description: 'Individual product cost breakdown and profitability analysis',
    path: '/reports/analysis/product-cost',
    icon: ADMIN_ICONS.products,
  },
  {
    id: 'modifier-options-cost',
    title: 'Modifier Options Cost',
    description: 'Cost analysis for menu modifiers and add-on options',
    path: '/reports/analysis/modifier-cost',
    icon: ADMIN_ICONS.modifiers,
  },
  {
    id: 'inventory-items-cost',
    title: 'Inventory Items Cost',
    description: 'Detailed cost tracking and variance analysis for inventory',
    path: '/reports/analysis/inventory-items-cost',
    icon: ADMIN_ICONS.items,
  },
];

export default function AnalysisReports() {
  return (
    <div className="p-6">
      <ReportsCardGrid
        title="Analysis Reports"
        description="Advanced analytics and cost analysis tools for business optimization."
        cards={analysisReportsCards}
      />
    </div>
  );
}
