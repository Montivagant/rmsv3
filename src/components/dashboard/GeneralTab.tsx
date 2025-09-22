import { useNavigate } from 'react-router-dom';
import { KpiCard } from '../ui/KpiCard';
import { ChartCard } from '../cards/ChartCard';
import { ListCard } from '../cards/ListCard';
import { useDashboardQuery } from '../../lib/dashboard/useDashboardQuery';
import { useAnalytics, formatCurrency, formatCount } from '../../hooks/useAnalytics';
import { generateSparkline } from '../../lib/dashboard/adapters';

/**
 * General dashboard tab - Today/period overview with KPIs, trends, and insights
 * Follows the specified information architecture with responsive grid
 */
export default function GeneralTab() {
  const navigate = useNavigate();
  const { query } = useDashboardQuery();
  
  // Get period from query, default to 'today'
  const period = query.period === 'day' ? 'today' : 
                query.period === 'week' ? 'week' : 
                query.period === 'month' ? 'month' : 'today';
  
  // Use real analytics data
  const { analytics, loading, error, refresh } = useAnalytics({ 
    period,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  });

  // Transform real analytics data for UI components
  const ordersKpi = analytics ? {
    title: 'Orders',
    value: formatCount(analytics.ordersKpi.count, 'order'),
    subtitle: `${formatCurrency(analytics.ordersKpi.averageOrderValue)} avg`,
    trend: {
      value: Math.abs(analytics.ordersKpi.trend),
      isPositive: analytics.ordersKpi.trend >= 0
    }
  } : null;

  const salesKpis = analytics ? [
    {
      title: 'Net Sales',
      value: formatCurrency(analytics.salesKpi.netSales),
      subtitle: period === 'today' ? 'Today' : `This ${period}`,
      trend: {
        value: Math.abs(analytics.salesKpi.trends.netSalesTrend),
        isPositive: analytics.salesKpi.trends.netSalesTrend >= 0
      },
      link: '/reports/sales'
    },
    {
      title: 'Payments',
      value: formatCurrency(analytics.salesKpi.netPayments),
      subtitle: 'Processed',
      trend: {
        value: Math.abs(analytics.salesKpi.trends.paymentsTrend),
        isPositive: analytics.salesKpi.trends.paymentsTrend >= 0
      },
      link: '/reports/payments'
    },
    {
      title: 'Returns',
      value: formatCurrency(analytics.salesKpi.returns),
      subtitle: 'Refunded',
      trend: {
        value: Math.abs(analytics.salesKpi.trends.returnsTrend),
        isPositive: analytics.salesKpi.trends.returnsTrend >= 0
      }
    },
    {
      title: 'Discounts',
      value: formatCurrency(analytics.salesKpi.discounts),
      subtitle: 'Applied',
      trend: {
        value: Math.abs(analytics.salesKpi.trends.discountsTrend),
        isPositive: analytics.salesKpi.trends.discountsTrend >= 0
      }
    }
  ] : [];

  // Generate sparkline data from recent trends
  const orderSparkline = analytics ? 
    generateSparkline([
      Math.max(0, analytics.ordersKpi.count - 7),
      Math.max(0, analytics.ordersKpi.count - 6),
      Math.max(0, analytics.ordersKpi.count - 5),
      Math.max(0, analytics.ordersKpi.count - 4),
      Math.max(0, analytics.ordersKpi.count - 3),
      Math.max(0, analytics.ordersKpi.count - 2),
      analytics.ordersKpi.count
    ]) : generateSparkline([0, 0, 0, 0, 0, 0, 0]);

  // Chart data from real analytics
  const orderTypesData = analytics ? 
    analytics.orderTypes.map(type => ({
      label: type.type,
      value: type.percentage
    })) : [];

  const hourlySalesData = analytics ? 
    analytics.hourlySales
      .filter(hour => parseInt(hour.hour.split(':')[0]) >= 9 && parseInt(hour.hour.split(':')[0]) <= 15)
      .map(hour => ({
        label: hour.hour.replace(':00', hour.hour.includes('12') ? 'PM' : 'AM'),
        value: hour.sales
      })) : [];

  // Real insights data
  const topProducts = analytics ? 
    analytics.topProducts.map((product) => ({
      id: product.id,
      primary: product.name,
      secondary: formatCount(product.soldCount, 'sold'),
      meta: formatCurrency(product.revenue),
      action: () => navigate(`/inventory/items`)
    })) : [];

  const topPayments = analytics ? 
    analytics.paymentMethods.map((method, index) => ({
      id: index + 1,
      primary: method.method,
      secondary: `${method.percentage.toFixed(1)}% of transactions`,
      meta: formatCurrency(method.amount)
    })) : [];

  const topBranches = analytics ? 
    analytics.branchPerformance.map(branch => ({
      id: branch.id,
      primary: branch.name,
      secondary: formatCount(branch.orderCount, 'order'),
      meta: formatCurrency(branch.revenue),
      action: () => navigate('/dashboard?tab=branches')
    })) : [];

  // Handle error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load dashboard data: {error}</p>
          <button 
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
            {...(kpi.link && {
              action: {
                label: 'View report',
                onClick: () => navigate(kpi.link!)
              }
            })}
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
