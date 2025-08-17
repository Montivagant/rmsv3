import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Select } from '../components';
import { useApi } from '../hooks/useApi';

interface ReportData {
  todayRevenue: number;
  todayOrders: number;
  avgOrderValue: number;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
  salesTrend: Array<{ date: string; revenue: number; orders: number }>;
}

const reportOptions = [
  { value: 'daily', label: 'Daily Sales' },
  { value: 'weekly', label: 'Weekly Summary' },
  { value: 'monthly', label: 'Monthly Report' },
  { value: 'inventory', label: 'Inventory Report' },
];

function Reports() {
  const { data: reportData, loading, error, refetch } = useApi<ReportData>('/api/reports');
  const [selectedReport, setSelectedReport] = useState('daily');
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Error loading reports: {error}</p>
        <Button onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View sales reports and business analytics
          </p>
        </div>
        <Button>Export Report</Button>
      </div>
      
      <div className="flex gap-4">
        <Select
          options={reportOptions}
          placeholder="Select report type"
          className="max-w-xs"
          value={selectedReport}
          onChange={(e) => setSelectedReport(e.target.value)}
        />
        <Button variant="outline" onClick={refetch}>Refresh</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Today's Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(reportData?.todayRevenue || 0)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Daily sales performance
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Orders Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {reportData?.todayOrders || 0}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Orders processed today
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Average Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatCurrency(reportData?.avgOrderValue || 0)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Average order value
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {reportData?.topItems?.length || 0}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Best-selling items
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData?.topItems?.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {item.quantity} sold
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(item.revenue)}
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-4">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData?.salesTrend?.slice(0, 7).map((day, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium">{formatDate(day.date)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {day.orders} orders
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(day.revenue)}
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-4">
                  No trend data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Reports;