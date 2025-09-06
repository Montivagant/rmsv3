import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KpiCard } from '../ui/KpiCard';
import { ChartCard } from '../cards/ChartCard';
import { ListCard } from '../cards/ListCard';
import { useDashboardQuery } from '../../lib/dashboard/useDashboardQuery';
import { 
  ordersAdapter, 
  salesAdapter, 
  formatCurrency, 
  formatCount,
  generateSparkline
} from '../../lib/dashboard/adapters';
import type { MockOrderData, MockSalesData } from '../../lib/dashboard/types';

/**
 * General dashboard tab - Today/period overview with KPIs, trends, and insights
 * Follows the specified information architecture with responsive grid
 */
export default function GeneralTab() {
  const navigate = useNavigate();
  const { query, dateRange } = useDashboardQuery();
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<{
    orders: MockOrderData;
    sales: MockSalesData;
  } | null>(null);

  // Simulate data loading
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data based on query period
      const baseMultiplier = query.period === 'day' ? 1 : query.period === 'week' ? 7 : 30;
      
      setKpiData({
        orders: {
          count: Math.floor(Math.random() * 50 * baseMultiplier) + 10,
          amount: Math.floor(Math.random() * 5000 * baseMultiplier) + 1000,
          trend: (Math.random() - 0.5) * 30 // -15% to +15%
        },
        sales: {
          netSales: Math.floor(Math.random() * 10000 * baseMultiplier) + 5000,
          netPayments: Math.floor(Math.random() * 9500 * baseMultiplier) + 4800,
          returns: Math.floor(Math.random() * 500 * baseMultiplier) + 100,
          discounts: Math.floor(Math.random() * 800 * baseMultiplier) + 200
        }
      });
      
      setLoading(false);
    };

    loadData();
  }, [query.period, query.branches, dateRange]);

  // Transform data using adapters
  const ordersKpi = kpiData ? ordersAdapter.transform(kpiData.orders) : null;
  const salesKpis = kpiData ? salesAdapter.transform(kpiData.sales) : [];

  // Generate sparkline data
  const orderSparkline = generateSparkline([45, 52, 38, 65, 42, 58, kpiData?.orders.count || 50]);

  // Chart data
  const orderTypesData = [
    { label: 'Dine In', value: 45 },
    { label: 'Takeout', value: 30 },
    { label: 'Delivery', value: 25 }
  ];

  const hourlySalesData = [
    { label: '9AM', value: 450 },
    { label: '10AM', value: 580 },
    { label: '11AM', value: 720 },
    { label: '12PM', value: 1250 },
    { label: '1PM', value: 1450 },
    { label: '2PM', value: 980 },
    { label: '3PM', value: 650 }
  ];

  // Insights data
  const topProducts = [
    { id: 1, primary: 'Classic Burger', secondary: '142 sold today', meta: formatCurrency(1420) },
    { id: 2, primary: 'French Fries', secondary: '98 sold today', meta: formatCurrency(490) },
    { id: 3, primary: 'Coca Cola', secondary: '87 sold today', meta: formatCurrency(261) },
    { id: 4, primary: 'Chicken Wings', secondary: '76 sold today', meta: formatCurrency(912) },
    { id: 5, primary: 'Caesar Salad', secondary: '54 sold today', meta: formatCurrency(648) }
  ];

  const topPayments = [
    { id: 1, primary: 'Cash', secondary: '45% of transactions', meta: formatCurrency(2280) },
    { id: 2, primary: 'Credit Card', secondary: '35% of transactions', meta: formatCurrency(1778) },
    { id: 3, primary: 'Mobile Pay', secondary: '20% of transactions', meta: formatCurrency(1016) }
  ];

  const topBranches = [
    { id: 1, primary: 'Main Branch', secondary: formatCount(28, 'order'), meta: formatCurrency(3200) },
    { id: 2, primary: 'Downtown', secondary: formatCount(22, 'order'), meta: formatCurrency(2680) },
    { id: 3, primary: 'Shopping Mall', secondary: formatCount(18, 'order'), meta: formatCurrency(2150) }
  ];

  return (
    <div className="space-y-6">
      {/* Top KPI Row - 5 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Orders KPI with sparkline */}
        {ordersKpi && (
          <KpiCard
            title={ordersKpi.title}
            value={ordersKpi.value}
            subtitle={ordersKpi.subtitle}
            trend={ordersKpi.trend}
            sparkline={orderSparkline}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            action={{
              label: 'View report',
              onClick: () => navigate('/orders/active')
            }}
            loading={loading}
          />
        )}

        {/* Sales KPIs */}
        {salesKpis.map((kpi, index) => (
          <KpiCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.subtitle}
            trend={kpi.trend}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            action={kpi.link ? {
              label: 'View report',
              onClick: () => navigate(kpi.link!)
            } : undefined}
            loading={loading}
          />
        ))}
      </div>

      {/* Trends Section - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Types Timeline */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Hourly Sales Trend"
            subtitle={`Sales performance throughout the ${query.period}`}
            type="bar"
            data={hourlySalesData}
            action={{
              label: 'View details',
              onClick: () => navigate('/reports/sales')
            }}
            loading={loading}
            height={280}
          />
        </div>

        {/* Order Types Distribution */}
        <ChartCard
          title="Order Types"
          subtitle="Distribution by order type"
          type="pie"
          data={orderTypesData}
          action={{
            label: 'View breakdown',
            onClick: () => navigate('/reports/orders')
          }}
          loading={loading}
          height={280}
        />
      </div>

      {/* Insights Section - Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products by Net Sales */}
        <ListCard
          title="Top Products by Net Sales"
          items={topProducts.map(product => ({
            ...product,
            action: () => navigate(`/inventory/items`)
          }))}
          action={{
            label: 'View all products',
            onClick: () => navigate('/reports/products')
          }}
          loading={loading}
          emptyMessage="No product sales data available"
        />

        {/* Top Payments */}
        <ListCard
          title="Top Payment Methods"
          items={topPayments}
          action={{
            label: 'View payment report',
            onClick: () => navigate('/reports/payments')
          }}
          loading={loading}
          emptyMessage="No payment data available"
        />

        {/* Top Branches */}
        <ListCard
          title="Top Performing Branches"
          items={topBranches.map(branch => ({
            ...branch,
            action: () => navigate('/dashboard?tab=branches')
          }))}
          action={{
            label: 'View all branches',
            onClick: () => navigate('/dashboard?tab=branches')
          }}
          loading={loading}
          emptyMessage="No branch data available"
        />
      </div>

      {/* Compare Period Section (when compare is enabled) */}
      {query.compare && (
        <div className="border-t border-border-secondary pt-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Period Comparison
            </h2>
            <p className="text-sm text-text-secondary">
              Comparing current {query.period} with previous {query.period}
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Comparison KPIs would go here */}
            <div className="bg-surface-secondary border border-border-secondary rounded-lg p-6 text-center">
              <p className="text-sm text-text-secondary">
                Comparison data will be displayed here when available
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
