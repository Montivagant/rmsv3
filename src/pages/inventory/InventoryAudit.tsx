import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
// cn removed as it's not used
import { Badge } from '../../components/Badge';
import { useRepository } from '../../hooks/useRepository';
import { useToast } from '../../hooks/useToast';
import { listInventoryCategories, listInventoryItemTypes, listInventoryAudits, listStorageAreas } from '../../inventory/repository';
import { listBranches } from '../../management/repository';
import { AuditList } from '../../components/inventory/audit/AuditList';
import NewAuditWizard from '../../components/inventory/audit/NewAuditWizard';
import type { 
  AuditQuery,
  AuditStatus 
} from '../../inventory/counts/types';

interface InventoryAuditProps {
  newAudit?: boolean;
}

export default function InventoryAudit({ newAudit = false }: InventoryAuditProps) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // State management
  const [activeTab, setActiveTab] = useState<'all' | AuditStatus>('all');
  const [isNewAuditOpen, setIsNewAuditOpen] = useState(newAudit);
  const [queryParams, setQueryParams] = useState<AuditQuery>({
    page: 1,
    pageSize: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Mock data - replace with actual API calls
  // Fetch audits using repository
  const { data: countsResponse, loading, refetch } = useRepository(
    () => listInventoryAudits({
      page: queryParams.page || 1,
      pageSize: queryParams.pageSize || 25,
      sortBy: queryParams.sortBy as any,
      sortOrder: queryParams.sortOrder || 'desc',
      status: (queryParams as any).status,
      branchId: (queryParams as any).branchId,
      search: (queryParams as any).search,
    }),
    [queryParams]
  );

  // Load real data from repositories
  const { data: branches = [] } = useRepository(listBranches, []);
  const { data: categories = [] } = useRepository(listInventoryCategories, []);
  const { data: itemTypes = [] } = useRepository(listInventoryItemTypes, []);
  const { data: storageAreas = [] } = useRepository(listStorageAreas, []);

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
  const handleTabChange = useCallback((tab: 'all' | AuditStatus) => {
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
    setQueryParams(prev => ({ ...prev, sortBy: sortBy as any, sortOrder }));
  }, []);

  const handleFilterChange = useCallback((filters: Partial<AuditQuery>) => {
    setQueryParams(prev => ({ ...prev, ...filters, page: 1 }));
  }, []);

  const handleViewAudit = useCallback((audit: any) => {
    navigate(`/inventory/audit/${audit.id}`);
  }, [navigate]);

  const handleResumeAudit = useCallback((audit: any) => {
    navigate(`/inventory/audit/${audit.id}/entry`);
  }, [navigate]);

  const handleExportAudit = useCallback((_audit: any) => {
    showToast({
      title: 'Export Started',
      description: 'Your export is being prepared and will be ready shortly.',
      variant: 'success'
    });
  }, [showToast]);

  const handleAuditCreated = useCallback((auditId: string) => {
    setIsNewAuditOpen(false);
    refetch();
    showToast({
      title: 'Audit Created',
      description: 'Your new audit session has been created successfully.',
      variant: 'success'
    });
    navigate(`/inventory/audit/${auditId}/entry`);
  }, [navigate, refetch, showToast]);

  // handleCountSheetsClick removed as it's not used

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Inventory Audit</h1>
            <p className="text-text-secondary mt-1">
              Manage physical Inventory Audit and reconcile stock levels
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={() => setIsNewAuditOpen(true)}
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
                    currency: 'EGP'
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
            <CardTitle>Audit Sessions</CardTitle>
            
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
                  onClick={() => handleTabChange(tab.id as 'all' | AuditStatus)}
                  className={activeTab === tab.id 
                    ? 'inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-brand text-text-inverse'
                    : 'inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-secondary transition-colors'
                  }
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <Badge 
                      variant={activeTab === tab.id ? "secondary" : "secondary"}
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
          <AuditList
            data={filteredCounts}
            total={total}
            page={queryParams.page || 1}
            pageSize={queryParams.pageSize || 25}
            loading={loading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSortChange={handleSortChange}
            onFilterChange={handleFilterChange}
            onViewAudit={handleViewAudit}
            onResumeAudit={handleResumeAudit}
            onExportAudit={handleExportAudit}
            onCreateNewAudit={() => setIsNewAuditOpen(true)}
          />
        </CardContent>
      </Card>

      {/* New Audit Wizard Modal */}
      <NewAuditWizard
        isOpen={isNewAuditOpen}
        onClose={() => setIsNewAuditOpen(false)}
        onSuccess={handleAuditCreated}
        branches={branches || []}
        categories={categories || []}
        itemTypes={itemTypes || []}
        storageAreas={storageAreas || []}
        loading={loading}
        simpleMode={true}
      />
    </div>
  );
}



