import { useState, useMemo, useCallback } from 'react';
import { useRepository, useRepositoryMutation } from '../../hooks/useRepository';
import { 
  listOrders, 
  updateOrderStatus, 
  completeOrder, 
  cancelOrder,
} from '../../orders/repository';
import type { OrderItem } from '../../orders/types';
import { formatCurrency } from '../../hooks/useAnalytics';
import { PageHeader } from '../../components/pos/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { DataTable } from '../../components/inventory/DataTable';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../shared/logger';


export default function OrderManagement() {
  const { showToast } = useToast();
  
  // State for filtering and searching
  const [statusFilter, setStatusFilter] = useState<any | 'all'>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<any | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  
  // Repository hooks - Get ALL orders, not just active ones  
  const fetchAllOrders = useCallback(() => 
    listOrders({ includeCompleted: true, includeCancelled: true }), 
    []
  );
  
  const { data: allOrders, loading, error, refetch } = useRepository(
    fetchAllOrders,
    []
  );
  
  const updateStatusMutation = useRepositoryMutation(
    ({ orderId, status }: { orderId: string; status: any }) =>
      updateOrderStatus(orderId, status)
  );
  
  const completeOrderMutation = useRepositoryMutation(
    ({ orderId, paymentMethod }: { orderId: string; paymentMethod: string }) =>
      completeOrder(orderId, paymentMethod)
  );
  const cancelOrderMutation = useRepositoryMutation(
    ({ orderId, reason }: { orderId: string; reason?: string }) =>
      cancelOrder(orderId, reason || 'No reason provided')
  );
  
  // Enhanced filtering logic
  const filteredOrders = useMemo(() => {
    if (!allOrders) return [];
    
    let filtered = [...allOrders];
    
    // Apply date filter
    const now = new Date();
    const getDateThreshold = () => {
      switch (dateRange) {
        case 'today':
          return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        case 'week': {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return weekAgo.getTime();
        }
        case 'month': {
          const monthAgo = new Date(now);
          monthAgo.setMonth(now.getMonth() - 1);
          return monthAgo.getTime();
        }
        default:
          return 0;
      }
    };
    
    const dateThreshold = getDateThreshold();
    if (dateThreshold > 0) {
      filtered = filtered.filter(order => order.createdAt >= dateThreshold);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Apply order type filter
    // NOTE: orderType is not available on OrderState
    // if (orderTypeFilter !== 'all') {
    //   filtered = filtered.filter(order => order.orderType === orderTypeFilter);
    // }
    
    // Apply payment filter
    // NOTE: paymentStatus is not available on OrderState
    // if (paymentFilter !== 'all') {
    //   filtered = filtered.filter(order => {
    //     if (paymentFilter === 'paid') return order.paymentStatus === 'paid';
    //     if (paymentFilter === 'pending') return order.paymentStatus !== 'paid';
    //     return true;
    //   });
    // }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.ticketId?.toLowerCase().includes(term) ||
        order.customerName?.toLowerCase().includes(term) ||
        order.notes?.toLowerCase().includes(term)
      );
    }
    
    // Sort by creation date (newest first)
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }, [allOrders, statusFilter, searchTerm, dateRange]);
  
  // Calculate analytics
  const analytics = useMemo(() => {
    if (!filteredOrders.length) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        statusCounts: {} as Record<any, number>,
        paymentStatusCounts: { paid: 0, pending: 0 }
      };
    }
    
    const statusCounts = filteredOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<any, number>);
    
    // NOTE: paymentStatus is not available on OrderState
    const paymentStatusCounts = { paid: 0, pending: 0 };
    
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.totals.total, 0);
    
    return {
      totalOrders: filteredOrders.length,
      totalRevenue,
      averageOrderValue: totalRevenue / filteredOrders.length,
      statusCounts,
      paymentStatusCounts
    };
  }, [filteredOrders]);
  
  // Event handlers
  const handleStatusUpdate = async (orderId: string, status: any) => {
    try {
      await updateStatusMutation.mutate({ orderId, status });
      showToast({
        title: 'Status Updated',
        description: `Order ${status} successfully`,
        variant: 'success'
      });
      refetch();
    } catch (error) {
      const err = error instanceof Error ? error : undefined;
      logger.error('Failed to update order status', { orderId, status, errorMessage: err?.message ?? String(error) }, err);
      showToast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'error'
      });
    }
  };
  
  const handleCompleteOrder = async (orderId: string) => {
    try {
      await completeOrderMutation.mutate({ orderId, paymentMethod: 'cash' });
      showToast({
        title: 'Order Completed',
        description: 'Order completed successfully',
        variant: 'success'
      });
      refetch();
    } catch (error) {
      const err = error instanceof Error ? error : undefined;
      logger.error('Failed to complete order', { orderId, errorMessage: err?.message ?? String(error) }, err);
      showToast({
        title: 'Error',
        description: 'Failed to complete order',
        variant: 'error'
      });
    }
  };
  
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      await cancelOrderMutation.mutate({ orderId, reason: 'Cancelled by staff' });
      showToast({
        title: 'Order Cancelled',
        description: 'Order cancelled successfully',
        variant: 'success'
      });
      refetch();
    } catch (error) {
      const err = error instanceof Error ? error : undefined;
      logger.error('Failed to cancel order', { orderId, errorMessage: err?.message ?? String(error) }, err);
      showToast({
        title: 'Error',
        description: 'Failed to cancel order',
        variant: 'error'
      });
    }
  };
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full bg-background">
        <PageHeader 
          title="Active Orders"
          description="View and manage currently active orders"
        />
        <div className="flex-1 p-6">
          <div className="card p-8">
            <div className="text-center">
              <p className="text-red-600 mb-4">Failed to load orders: {error}</p>
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Define table columns for order management
  const columns = [
    {
      key: 'orderNumber',
      header: 'Order #',
      accessor: (order: any) => (
        <div className="font-mono text-sm font-medium">
          {order.orderNumber || order.id.slice(-8)}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'customer',
      header: 'Customer',
      accessor: (order: any) => (
        <div>
          <div className="font-medium text-sm">
            {order.customer?.name || 'Walk-in'}
          </div>
          {order.customer?.phone && (
            <div className="text-xs text-gray-500">{order.customer?.phone}</div>
          )}
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      accessor: (order: any) => (
        <Badge className="bg-gray-100 text-gray-800">
          {order.source || 'pos'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (order: any) => (
        <Badge className={
          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
          order.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
          order.status === 'ready' ? 'bg-green-100 text-green-800' :
          order.status === 'completed' ? 'bg-gray-100 text-gray-800' :
          'bg-red-100 text-red-800'
        }>
          {order.status}
        </Badge>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      accessor: (order: any) => (
        <div className="text-sm">
          <div>{order.items.length} items</div>
          <div className="text-xs text-gray-500 truncate max-w-32">
            {order.items.slice(0, 2).map((item: OrderItem) => `${item.quantity}x ${item.name}`).join(', ')}
            {order.items.length > 2 && '...'}
          </div>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      accessor: (order: any) => (
        <div className="text-right">
          <div className="font-medium">{formatCurrency(order.totals.total, 'EGP')}</div>
          {order.totals.discount > 0 && (
            <div className="text-xs text-green-600">
              -{formatCurrency(order.totals.discount, 'EGP')}
            </div>
          )}
        </div>
      ),
      align: 'right' as const,
    },
    {
      key: 'createdAt',
      header: 'Created',
      accessor: (order: any) => (
        <div className="text-sm text-gray-600">
          <div>{new Date(order.createdAt).toLocaleDateString()}</div>
          <div>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (order: any) => (
        <div className="flex gap-1">
          {order.status === 'pending' && (
            <Button 
              onClick={() => handleStatusUpdate(order.id, 'confirmed')}
              size="sm" 
              variant="primary"
            >
              Confirm
            </Button>
          )}
          {order.status === 'ready' && (
            <Button 
              onClick={() => handleCompleteOrder(order.id)}
              size="sm" 
              variant="primary"
            >
              Complete
            </Button>
          )}
          {['pending', 'confirmed'].includes(order.status) && (
            <Button 
              onClick={() => handleCancelOrder(order.id)}
              size="sm" 
              variant="destructive"
            >
              Cancel
            </Button>
          )}
        </div>
      ),
      align: 'right' as const,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader 
        title="Order Management"
        description="Comprehensive order tracking, customer service, and business analytics"
        actions={
          <Button onClick={() => refetch()} disabled={loading} size="sm">
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />
      
      <div className="flex-1 p-6 overflow-auto">
        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary">{analytics.totalOrders}</div>
            <div className="text-sm text-gray-600">Total Orders</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(analytics.totalRevenue, 'EGP')}</div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(analytics.averageOrderValue || 0, 'EGP')}</div>
            <div className="text-sm text-gray-600">Avg Order Value</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">{analytics.paymentStatusCounts.paid}</div>
            <div className="text-sm text-gray-600">Paid Orders</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{analytics.paymentStatusCounts.pending}</div>
            <div className="text-sm text-gray-600">Pending Payment</div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <Input
                placeholder="Order #, customer, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <Select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
              >
                <option value="today">Today</option>
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="all">All Time</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Order Type</label>
              <Select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value as any)}
              >
                <option value="all">All Types</option>
                <option value="dine-in">Dine In</option>
                <option value="takeout">Takeout</option>
                <option value="delivery">Delivery</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment</label>
              <Select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
              >
                <option value="all">All Payment Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  setStatusFilter('all');
                  setOrderTypeFilter('all');
                  setPaymentFilter('all');
                  setSearchTerm('');
                  setDateRange('today');
                }}
                variant="secondary"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
        
        {/* Orders Table */}
        {loading ? (
          <Card className="p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </Card>
        ) : error ? (
          <Card className="p-8">
            <div className="text-center">
              <p className="text-red-600 mb-4">Failed to load orders: {error}</p>
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          </Card>
        ) : filteredOrders.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                Orders ({filteredOrders.length} of {allOrders?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={filteredOrders}
                keyExtractor={(order) => order.id}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="p-8">
            <EmptyState
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              title="No Orders Found"
              description="No orders match your current filters. Try adjusting the date range or clearing filters."
              action={{
                label: "Clear All Filters",
                onClick: () => {
                  setStatusFilter('all');
                  setOrderTypeFilter('all');
                  setPaymentFilter('all');
                  setSearchTerm('');
                  setDateRange('all');
                },
                variant: "secondary"
              }}
            />
          </Card>
        )}
      </div>
    </div>
  );
}