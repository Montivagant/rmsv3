import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { cn } from '../../lib/utils';
import { Badge } from '../../components/Badge';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { CountsList } from '../../components/inventory/counts/CountsList';
import NewCountWizard from '../../components/inventory/counts/NewCountWizard';
import type { 
  InventoryCount, 
  CountQuery,
  CountsResponse,
  CountStatus 
} from '../../inventory/counts/types';

export default function Counts() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState<'all' | CountStatus>('all');
  const [isNewCountOpen, setIsNewCountOpen] = useState(false);
  const [queryParams, setQueryParams] = useState<CountQuery>({
    page: 1,
    pageSize: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Mock data - replace with actual API calls
  const { data: countsResponse, loading, error, refetch } = useApi<CountsResponse>('/api/inventory/counts', {
    params: queryParams
  });

  // Mock data for development
  const branches = [
    { id: 'main-restaurant', name: 'Main Restaurant', type: 'restaurant' },
    { id: 'downtown-location', name: 'Downtown Location', type: 'restaurant' },
    { id: 'warehouse', name: 'Central Warehouse', type: 'warehouse' }
  ];

  const categories = [
    { id: 'produce', name: 'Produce' },
    { id: 'meat', name: 'Meat & Seafood' },
    { id: 'dairy', name: 'Dairy & Eggs' },
    { id: 'beverages', name: 'Beverages' },
    { id: 'dry-goods', name: 'Dry Goods' }
  ];

  const suppliers = [
    { id: 'fresh-foods', name: 'Fresh Foods Inc' },
    { id: 'metro-wholesale', name: 'Metro Wholesale' },
    { id: 'organic-farms', name: 'Organic Farms Co' },
    { id: 'quality-meats', name: 'Quality Meats Co' },
    { id: 'dairy-farm', name: 'Local Dairy Farm' }
  ];

  const storageAreas = [
    { id: 'dry-storage', name: 'Dry Storage' },
    { id: 'walk-in-cooler', name: 'Walk-in Cooler' },
    { id: 'freezer', name: 'Freezer' },
    { id: 'prep-kitchen', name: 'Prep Kitchen' },
    { id: 'bar-storage', name: 'Bar Storage' },
    { id: 'back-office', name: 'Back Office' }
  ];

  // Ensure counts is always an array
  const counts = countsResponse?.data || [];
  const total = countsResponse?.total || 0;

  // Filter counts by active tab
  const filteredCounts = useMemo(() => {
    switch (activeTab) {
      case 'draft':
      case 'open':
      case 'closed':
      case 'cancelled':
        return counts.filter(c => c.status === activeTab);
      case 'all':
      default:
        return counts;
    }
  }, [counts, activeTab]);

  // Tab counts for badges
  const tabCounts = useMemo(() => {
    return {
      all: counts.length,
      draft: counts.filter(c => c.status === 'draft').length,
      open: counts.filter(c => c.status === 'open').length,
      closed: counts.filter(c => c.status === 'closed').length,
      cancelled: counts.filter(c => c.status === 'cancelled').length
    };
  }, [counts]);

  // Mock statistics
  const stats = {
    activeCount: counts.filter(c => ['draft', 'open'].includes(c.status)).length,
    completedThisMonth: counts.filter(c => c.status === 'closed').length,
    totalVariance: 3745.29
  };

  // Event handlers
  const handleTabChange = useCallback((tab: 'all' | CountStatus) => {
    setActiveTab(tab);
    setQueryParams(prev => ({ ...prev, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setQueryParams(prev => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setQueryParams(prev => ({ ...prev, pageSize, page: 1 }));
  }, []);

  const handleSortChange = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    setQueryParams(prev => ({ ...prev, sortBy, sortOrder }));
  }, []);

  const handleFilterChange = useCallback((filters: Partial<CountQuery>) => {
    setQueryParams(prev => ({ ...prev, ...filters, page: 1 }));
  }, []);

  const handleViewCount = useCallback((count: InventoryCount) => {
    navigate(`/inventory/counts/${count.id}`);
  }, [navigate]);

  const handleResumeCount = useCallback((count: InventoryCount) => {
    navigate(`/inventory/counts/${count.id}/entry`);
  }, [navigate]);

  const handleExportCount = useCallback((count: InventoryCount) => {
    showToast({
      title: 'Export Started',
      description: 'Your export is being prepared and will be ready shortly.',
      variant: 'success'
    });
  }, [showToast]);

  const handleCountCreated = useCallback((countId: string) => {
    setIsNewCountOpen(false);
    refetch();
    showToast({
      title: 'Count Created',
      description: 'Your new count session has been created successfully.',
      variant: 'success'
    });
    navigate(`/inventory/counts/${countId}/entry`);
  }, [navigate, refetch, showToast]);

  const handleCountSheetsClick = useCallback(() => {
    navigate('/inventory/count-sheets');
  }, [navigate]);

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Inventory Counts</h1>
            <p className="text-text-secondary mt-1">
              Manage physical inventory counts and reconcile stock levels
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/inventory/count-sheets')}
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Count Sheets
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsNewCountOpen(true)}
              className="flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Count
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-warning/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-text-secondary">Active Counts</p>
                <p className="text-2xl font-bold text-text-primary">{stats.activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-success/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-text-secondary">This Month</p>
                <p className="text-2xl font-bold text-text-primary">{stats.completedThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-brand/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-text-secondary">Total Variance</p>
                <p className="text-2xl font-bold text-text-primary">
                  {stats.totalVariance.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Counts Table with Tabs */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Count Sessions</CardTitle>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1">
              {[
                { id: 'all', label: 'All', count: tabCounts.all },
                { id: 'draft', label: 'Draft', count: tabCounts.draft },
                { id: 'open', label: 'Open', count: tabCounts.open },
                { id: 'closed', label: 'Closed', count: tabCounts.closed }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={activeTab === tab.id 
                    ? 'inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-brand text-text-inverse'
                    : 'inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors'
                  }
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <Badge 
                      variant={activeTab === tab.id ? "secondary" : "outline"}
                      className="ml-2"
                    >
                      {tab.count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <CountsList
            data={filteredCounts}
            total={total}
            page={queryParams.page || 1}
            pageSize={queryParams.pageSize || 25}
            loading={loading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSortChange={handleSortChange}
            onFilterChange={handleFilterChange}
            onViewCount={handleViewCount}
            onResumeCount={handleResumeCount}
            onExportCount={handleExportCount}
          />
        </CardContent>
      </Card>

      {/* New Count Wizard Modal */}
      <NewCountWizard
        isOpen={isNewCountOpen}
        onClose={() => setIsNewCountOpen(false)}
        onSuccess={handleCountCreated}
        branches={branches}
        categories={categories}
        suppliers={suppliers}
        storageAreas={storageAreas}
        loading={loading}
      />
    </div>
  );
}