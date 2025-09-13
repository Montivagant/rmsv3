/**
 * Inventory History - Transaction Log View
 * Shows all inventory movements, adjustments, and audit trails
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { useApi } from '../../hooks/useApi';
import { cn } from '../../lib/utils';

interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  type: 'sale' | 'adjustment' | 'transfer' | 'audit' | 'waste' | 'received';
  quantity: number;
  unit: string;
  cost?: number;
  reason?: string;
  reference?: string; // Order ID, Transfer ID, Audit ID, etc.
  userId: string;
  userName: string;
  branchId: string;
  branchName: string;
  createdAt: string;
}

interface HistoryQuery {
  search?: string;
  type?: string;
  branchId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export default function History() {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [queryParams, setQueryParams] = useState<HistoryQuery>({
    page: 1,
    pageSize: 50
  });

  // Build API URL with query parameters
  const historyUrl = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });
    if (searchTerm) params.set('search', searchTerm);
    if (selectedType) params.set('type', selectedType);
    if (selectedBranch) params.set('branchId', selectedBranch);
    return `/api/inventory/movements?${params.toString()}`;
  }, [queryParams, searchTerm, selectedType, selectedBranch]);

  // API call
  const { data: movementsResponse, loading, error, refetch } = useApi<{
    movements: InventoryMovement[];
    total: number;
    page: number;
    pageSize: number;
  }>(historyUrl);

  const movements = movementsResponse?.movements || [];
  const total = movementsResponse?.total || 0;

  // Movement type styling
  const getMovementBadge = (type: InventoryMovement['type']) => {
    const config = {
      sale: { variant: 'success' as const, label: 'Sale' },
      adjustment: { variant: 'warning' as const, label: 'Adjustment' },
      transfer: { variant: 'info' as const, label: 'Transfer' },
      audit: { variant: 'secondary' as const, label: 'Audit' },
      waste: { variant: 'destructive' as const, label: 'Waste' },
      received: { variant: 'success' as const, label: 'Received' },
    };
    return config[type] || { variant: 'secondary' as const, label: type };
  };

  // Format quantity display
  const formatQuantity = (quantity: number, unit: string) => {
    const sign = quantity >= 0 ? '+' : '';
    return `${sign}${quantity} ${unit}`;
  };

  // Loading state
  if (loading && movements.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-error mb-4">Failed to load inventory history</p>
          <button onClick={refetch} className="btn-base btn-outline">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-primary mb-1">Inventory History</h1>
          <p className="text-body text-secondary">
            Track all inventory movements, adjustments, and transactions
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search items, SKU, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select
              placeholder="All Types"
              value={selectedType}
              onValueChange={setSelectedType}
              options={[
                { value: '', label: 'All Types' },
                { value: 'sale', label: 'Sales' },
                { value: 'adjustment', label: 'Adjustments' },
                { value: 'transfer', label: 'Transfers' },
                { value: 'audit', label: 'Audits' },
                { value: 'waste', label: 'Waste' },
                { value: 'received', label: 'Received' }
              ]}
            />
            
            <Select
              placeholder="All Branches"
              value={selectedBranch}
              onValueChange={setSelectedBranch}
              options={[
                { value: '', label: 'All Branches' },
                { value: 'main-restaurant', label: 'Main Restaurant' },
                { value: 'downtown-location', label: 'Downtown Location' }
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      {movements.length === 0 && !loading ? (
        <EmptyState
          title="No movement history"
          description={searchTerm || selectedType || selectedBranch ? "No movements match your filter criteria." : "Inventory movements will appear here as they occur."}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="border-b border-border px-6 py-3 bg-surface-secondary/50">
              <div className="grid grid-cols-8 gap-4 text-sm font-medium text-text-secondary">
                <div className="col-span-2">Item</div>
                <div>Type</div>
                <div>Quantity</div>
                <div>Cost</div>
                <div>User</div>
                <div>Reference</div>
                <div>Date</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border">
              {movements.map((movement) => {
                const badge = getMovementBadge(movement.type);
                return (
                  <div key={movement.id} className="px-6 py-4 hover:bg-surface-secondary/30 transition-colors">
                    <div className="grid grid-cols-8 gap-4 items-center">
                      {/* Item Info */}
                      <div className="col-span-2">
                        <div>
                          <h3 className="font-medium text-text-primary">{movement.itemName}</h3>
                          <p className="text-sm text-text-secondary">{movement.itemSku}</p>
                        </div>
                      </div>

                      {/* Type */}
                      <div>
                        <Badge variant={badge.variant} size="sm">
                          {badge.label}
                        </Badge>
                      </div>

                      {/* Quantity */}
                      <div>
                        <span className={cn(
                          "font-medium",
                          movement.quantity >= 0 ? "text-success" : "text-error"
                        )}>
                          {formatQuantity(movement.quantity, movement.unit)}
                        </span>
                      </div>

                      {/* Cost */}
                      <div>
                        {movement.cost ? (
                          <span className="text-text-primary">
                            ${movement.cost.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </div>

                      {/* User */}
                      <div>
                        <span className="text-sm text-text-primary">
                          {movement.userName}
                        </span>
                      </div>

                      {/* Reference */}
                      <div>
                        {movement.reference ? (
                          <code className="text-xs text-text-secondary bg-surface-secondary px-2 py-1 rounded">
                            {movement.reference}
                          </code>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </div>

                      {/* Date */}
                      <div>
                        <div className="text-sm text-text-primary">
                          {new Date(movement.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-text-muted">
                          {new Date(movement.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {total > (queryParams.pageSize || 50) && (
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setQueryParams(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
              disabled={!queryParams.page || queryParams.page <= 1}
              className="btn-base btn-outline btn-sm"
            >
              Previous
            </button>
            
            <span className="text-sm text-text-muted">
              Page {queryParams.page || 1} of {Math.ceil(total / (queryParams.pageSize || 50))}
            </span>
            
            <button
              onClick={() => setQueryParams(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
              disabled={(queryParams.page || 1) >= Math.ceil(total / (queryParams.pageSize || 50))}
              className="btn-base btn-outline btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
