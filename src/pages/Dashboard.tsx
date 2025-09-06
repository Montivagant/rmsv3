import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/cards/StatCard';
import { ListCard } from '../components/cards/ListCard';
import { ChartCard } from '../components/cards/ChartCard';
import { ActionMenu } from '../components/ui/ActionMenu';

interface DashboardProps {
  userRole?: 'business_owner';
}

const Dashboard: React.FC<DashboardProps> = ({ userRole = 'business_owner' }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Mock data - would come from your event store or API
  const todaysSales = 2847.32;
  const yesterdaysSales = 2543.18;
  const salesTrend = ((todaysSales - yesterdaysSales) / yesterdaysSales) * 100;

  const activeOrders = 8;
  const staffOnline = 5;
  const lowStockItems = 3;

  // Recent activity data
  const recentActivity = [
    { id: 1, primary: 'Order #1234 completed', secondary: 'Table 5', meta: '2 min ago', status: 'success' as const },
    { id: 2, primary: 'Low stock alert', secondary: 'Burger Buns', meta: '15 min ago', status: 'warning' as const },
    { id: 3, primary: 'New customer registered', secondary: 'John Doe', meta: '1 hour ago', status: 'info' as const },
    { id: 4, primary: 'Order #1233 cancelled', secondary: 'Refund processed', meta: '2 hours ago', status: 'error' as const },
    { id: 5, primary: 'Daily backup completed', secondary: 'System', meta: '3 hours ago', status: 'success' as const },
  ];

  // Sales chart data
  const salesChartData = [
    { label: 'Mon', value: 2100 },
    { label: 'Tue', value: 2400 },
    { label: 'Wed', value: 2200 },
    { label: 'Thu', value: 2800 },
    { label: 'Fri', value: 3200 },
    { label: 'Sat', value: 3800 },
    { label: 'Sun', value: 2847 },
  ];

  // Category sales data (colors derived from theme tokens in ChartCard)
  const categorySalesData = [
    { label: 'Burgers', value: 45 },
    { label: 'Drinks', value: 25 },
    { label: 'Sides', value: 20 },
    { label: 'Desserts', value: 10 },
  ];

  // Top selling items
  const topSellingItems = [
    { id: 1, primary: 'Classic Burger', secondary: '142 sold', meta: '$1,420.00' },
    { id: 2, primary: 'French Fries', secondary: '98 sold', meta: '$392.00' },
    { id: 3, primary: 'Coca Cola', secondary: '87 sold', meta: '$261.00' },
    { id: 4, primary: 'Chicken Wings', secondary: '76 sold', meta: '$684.00' },
    { id: 5, primary: 'Caesar Salad', secondary: '54 sold', meta: '$432.00' },
  ];

  // Alerts based on role
  const alerts = [
    { id: 1, primary: 'Low stock: Burger Buns', secondary: 'Only 10 units remaining', meta: 'Order now', status: 'warning' as const, action: () => navigate('/inventory') },
    { id: 2, primary: 'Staff schedule', secondary: '2 shifts need coverage', meta: 'Tomorrow', status: 'error' as const, action: () => navigate('/staff') },
    { id: 3, primary: 'Pending reviews', secondary: '5 customer reviews awaiting response', meta: 'View all', status: 'info' as const, action: () => navigate('/reviews') },
  ];

  // Quick actions based on role
  const quickActionItems = [
    { id: 'pos', label: 'Open POS', icon: renderIcon('M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'), onClick: () => navigate('/pos') },
    { id: 'order', label: 'New Order', icon: renderIcon('M12 4v16m8-8H4'), onClick: () => navigate('/pos') },
    // Business Owner quick actions
    { id: 'menu', label: 'Add Menu Item', icon: renderIcon('M12 6v6m0 0v6m0-6h6m-6 0H6'), onClick: () => navigate('/menu/products') },
    { id: 'stock', label: 'Receive Stock', icon: renderIcon('M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4'), onClick: () => navigate('/inventory') },
    { id: 'reports', label: 'View Reports', icon: renderIcon('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'), onClick: () => navigate('/reports') },
    { id: 'account', label: 'Account Settings', icon: renderIcon('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'), onClick: () => navigate('/account/profile') },
  ];

  function renderIcon(path: string) {
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
      </svg>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-primary">
            Dashboard
          </h1>
          <p className="text-body-md text-secondary mt-1">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <ActionMenu items={quickActionItems} label="Quick Actions" />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={`$${todaysSales.toLocaleString()}`}
          subtitle="12 orders completed"
          trend={{ value: salesTrend, isPositive: salesTrend > 0 }}
          icon={renderIcon('M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z')}
          action={{ label: 'View report', onClick: () => navigate('/reports/sales') }}
          loading={loading}
        />
        <StatCard
          title="Active Orders"
          value={activeOrders}
          subtitle="2 in kitchen, 6 ready"
          icon={renderIcon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2')}
          action={{ label: 'View orders', onClick: () => navigate('/orders/active') }}
          loading={loading}
        />
        <StatCard
          title="Staff Online"
          value={staffOnline}
          subtitle="3 servers, 2 kitchen"
          icon={renderIcon('M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z')}
          action={{ label: 'Manage staff', onClick: () => navigate('/staff') }}
          loading={loading}
        />
        <StatCard
          title="Low Stock Items"
          value={lowStockItems}
          subtitle="Requires attention"
          trend={{ value: 50, isPositive: false }}
          icon={renderIcon('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4')}
          action={{ label: 'View inventory', onClick: () => navigate('/inventory') }}
          loading={loading}
        />
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Weekly Sales"
            subtitle="Last 7 days performance"
            type="bar"
            data={salesChartData}
            action={{ label: 'View details', onClick: () => navigate('/reports/sales') }}
            loading={loading}
            height={250}
          />
        </div>

        {/* Category Distribution */}
        <ChartCard
          title="Sales by Category"
          subtitle="Today's breakdown"
          type="pie"
          data={categorySalesData}
          action={{ label: 'View all', onClick: () => navigate('/reports/categories') }}
          loading={loading}
          height={250}
        />
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <ListCard
          title="Recent Activity"
          items={recentActivity}
          action={{ label: 'View all', onClick: () => navigate('/activity') }}
          loading={loading}
        />

        {/* Top Selling Items */}
        <ListCard
          title="Top Selling Items"
          items={topSellingItems.map(item => ({
            ...item,
            action: () => navigate(`/inventory/item/${item.id}`)
          }))}
          action={{ label: 'View report', onClick: () => navigate('/reports/products') }}
          loading={loading}
        />

        {/* Alerts */}
        {(userRole === 'admin' || userRole === 'technical_admin') && (
          <ListCard
            title="Alerts & Tasks"
            items={alerts}
            action={{ label: 'View all', onClick: () => navigate('/alerts') }}
            loading={loading}
          />
        )}
      </div>

      {/* Business Analytics for Business Owner */}
      {userRole === 'business_owner' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Revenue Trend"
            subtitle="Last 30 days"
            type="line"
            data={[
              { label: 'Week 1', value: 18500 },
              { label: 'Week 2', value: 21000 },
              { label: 'Week 3', value: 19800 },
              { label: 'Week 4', value: 22500 },
            ]}
            action={{ label: 'Financial report', onClick: () => navigate('/reports/financial') }}
            loading={loading}
          />

          <ListCard
            title="Pending Tasks"
            items={[
              { id: 1, primary: 'Review supplier invoice', secondary: 'Due today', meta: 'High', status: 'error' as const },
              { id: 2, primary: 'Update menu prices', secondary: 'Scheduled', meta: 'Medium', status: 'warning' as const },
              { id: 3, primary: 'Staff meeting', secondary: 'Tomorrow 3 PM', meta: 'Low', status: 'info' as const },
            ]}
            action={{ label: 'Manage tasks', onClick: () => navigate('/tasks') }}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
