import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Select } from '../components';
import { useApi } from '../hooks/useApi';
import { ZReport } from '../reports/ZReport';

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
  { value: 'z-report', label: 'End of Day (Z-Report)' },
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary">Loading your reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-error-600">Error loading reports: {error}</p>
        <Button onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Reports & Analytics
          </h1>
          <p className="text-secondary">
            View sales reports and business analytics
          </p>
        </div>
        <Button>Export Current Report</Button>
      </div>
      
      <div className="flex gap-4">
        <Select
          options={reportOptions}
          placeholder="Choose report type"
          className="max-w-xs"
          value={selectedReport}
          onChange={(e) => setSelectedReport(e.target.value)}
        />
        <Button variant="outline" onClick={refetch}>Update Data</Button>
      </div>
      
      {selectedReport === 'z-report' ? (
        <ZReport />
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Today's Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success-600">
              {formatCurrency(reportData?.todayRevenue || 0)}
            </div>
            <p className="text-sm text-secondary">
              Daily sales performance
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Orders Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-600">
              {reportData?.todayOrders || 0}
            </div>
            <p className="text-sm text-secondary">
              Orders processed today
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Average Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-600">
              {formatCurrency(reportData?.avgOrderValue || 0)}
            </div>
            <p className="text-sm text-secondary">
              Average order value
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-600">
              {reportData?.topItems?.length || 0}
            </div>
            <p className="text-sm text-secondary">
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
                <div key={index} className="flex justify-between items-center p-3 bg-surface-secondary rounded-lg">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-secondary">
                      {item.quantity} sold
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-success-600">
                      {formatCurrency(item.revenue)}
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center text-tertiary py-4">
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
                <div key={index} className="flex justify-between items-center p-3 bg-surface-secondary rounded-lg">
                  <div>
                    <div className="font-medium">{formatDate(day.date)}</div>
                    <div className="text-sm text-secondary">
                      {day.orders} orders
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-primary-600">
                      {formatCurrency(day.revenue)}
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center text-tertiary py-4">
                  No trend data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
        </>
      )}
    </div>
  );
}

export default Reports;