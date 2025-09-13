/**
 * Menu Items Management Page
 * CRUD interface for menu items with search, filtering, and availability management
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { DropdownMenu, DropdownMenuItem } from '../../components/DropdownMenu';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../lib/utils';
import MenuItemCreateModal from '../../components/menu/MenuItemCreateModal';
import type { 
  MenuItem, 
  MenuItemQuery, 
  MenuItemsResponse 
} from '../../menu/items/types';
import type { MenuCategory } from '../../menu/categories/types';
import { menuItemsApi } from '../../menu/items/api';

export default function MenuItems() {
  const { showToast } = useToast();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [queryParams, setQueryParams] = useState<MenuItemQuery>({
    page: 1,
    pageSize: 25,
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // API calls
  const itemsUrl = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });
    if (searchTerm) params.set('search', searchTerm);
    if (selectedCategory) params.set('categoryId', selectedCategory);
    if (selectedStatus === 'active') params.set('isActive', 'true');
    if (selectedStatus === 'inactive') params.set('isActive', 'false');
    return `/api/menu/items?${params.toString()}`;
  }, [queryParams, searchTerm, selectedCategory, selectedStatus]);

  const { data: itemsResponse, loading, error, refetch } = useApi<MenuItemsResponse>(itemsUrl);
  const { data: categoriesResponse } = useApi<{ categories: MenuCategory[] }>('/api/menu/categories');

  const items = itemsResponse?.items || [];
  const total = itemsResponse?.total || 0;
  const categories = categoriesResponse?.categories || [];

  // Event handlers
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setQueryParams(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleCategoryFilter = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setQueryParams(prev => ({ ...prev, page: 1 }));
  }, []);

  const handleStatusFilter = useCallback((status: string) => {
    setSelectedStatus(status);
    setQueryParams(prev => ({ ...prev, page: 1 }));
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setQueryParams(prev => ({ ...prev, page }));
  }, []);

  const handleSort = useCallback((field: string) => {
    setQueryParams(prev => ({
      ...prev,
      sortBy: field as any,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  }, []);

  const handleItemCreated = useCallback(() => {
    setIsCreateModalOpen(false);
    refetch();
    showToast({
      title: 'Success',
      description: 'Menu item created successfully',
      variant: 'success'
    });
  }, [refetch, showToast]);

  const handleEditItem = useCallback((item: MenuItem) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  }, []);

  const handleItemUpdated = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedItem(null);
    refetch();
    showToast({
      title: 'Success',
      description: 'Menu item updated successfully',
      variant: 'success'
    });
  }, [refetch, showToast]);

  const handleToggleAvailability = useCallback(async (item: MenuItem) => {
    try {
      await menuItemsApi.toggleAvailability(item.id, !item.isAvailable);
      refetch();
      showToast({
        title: 'Success',
        description: `Item ${item.isAvailable ? 'disabled' : 'enabled'} successfully`,
        variant: 'success'
      });
    } catch (error) {
      showToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update availability',
        variant: 'error'
      });
    }
  }, [refetch, showToast]);

  const handleDeleteItem = useCallback(async (item: MenuItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await menuItemsApi.delete(item.id);
      refetch();
      showToast({
        title: 'Success',
        description: 'Menu item deleted successfully',
        variant: 'success'
      });
    } catch (error) {
      showToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete menu item',
        variant: 'error'
      });
    }
  }, [refetch, showToast]);

  // Get category name
  const getCategoryName = useCallback((categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)?.name || 'Unknown';
  }, [categories]);

  // Loading state
  if (loading && items.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
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
          <p className="text-error mb-4">Failed to load menu items</p>
          <Button onClick={refetch} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-primary mb-1">Menu Items</h1>
          <p className="text-body text-secondary">
            Manage your menu items, pricing, and availability
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="min-h-[44px]"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Menu Item
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select
              placeholder="All Categories"
              value={selectedCategory}
              onValueChange={handleCategoryFilter}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
            />
            
            <Select
              placeholder="All Status"
              value={selectedStatus}
              onValueChange={handleStatusFilter}
              options={[
                { value: '', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
            
            <div className="flex items-center gap-2 text-sm text-text-muted">
              {total} {total === 1 ? 'item' : 'items'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items List */}
      {items.length === 0 && !loading ? (
        <EmptyState
          title="No menu items found"
          description={searchTerm ? "No items match your search criteria." : "Create your first menu item to start building your menu."}
          action={{
            label: "Add Menu Item",
            onClick: () => setIsCreateModalOpen(true)
          }}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0">
              {/* Table Header */}
              <div className="border-b border-border px-6 py-3 bg-surface-secondary/50">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-text-secondary">
                  <div className="col-span-3">Item</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-2">Price</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Availability</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <div key={item.id} className="px-6 py-4 hover:bg-surface-secondary/30 transition-colors">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Item Info */}
                      <div className="col-span-3">
                        <div>
                          <h3 className="font-medium text-text-primary">{item.name}</h3>
                          <p className="text-sm text-text-secondary">{item.sku}</p>
                          {item.description && (
                            <p className="text-xs text-text-muted mt-1 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Category */}
                      <div className="col-span-2">
                        <span className="text-sm text-text-primary">
                          {getCategoryName(item.categoryId)}
                        </span>
                      </div>

                      {/* Price */}
                      <div className="col-span-2">
                        <div className="text-lg font-semibold text-text-primary">
                          ${item.price.toFixed(2)}
                        </div>
                        {item.taxRate > 0 && (
                          <div className="text-xs text-text-muted">
                            +{(item.taxRate * 100).toFixed(0)}% tax
                          </div>
                        )}
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <Badge 
                          variant={item.isActive ? 'success' : 'secondary'}
                          size="sm"
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      {/* Availability */}
                      <div className="col-span-2">
                        <Button
                          variant={item.isAvailable ? 'success' : 'outline'}
                          size="sm"
                          onClick={() => handleToggleAvailability(item)}
                          className={cn(
                            "min-h-[36px]",
                            !item.isAvailable && "border-warning text-warning hover:bg-warning/10"
                          )}
                        >
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </Button>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 text-right">
                        <DropdownMenu
                          trigger={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </Button>
                          }
                        >
                          <DropdownMenuItem onClick={() => handleEditItem(item)}>
                            Edit Item
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleAvailability(item)}>
                            {item.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteItem(item)}
                            className="text-error"
                          >
                            Delete Item
                          </DropdownMenuItem>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {total > (queryParams.pageSize || 25) && (
        <div className="flex justify-center">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange((queryParams.page || 1) - 1)}
              disabled={!queryParams.page || queryParams.page <= 1}
            >
              Previous
            </Button>
            
            <span className="text-sm text-text-muted">
              Page {queryParams.page || 1} of {Math.ceil(total / (queryParams.pageSize || 25))}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange((queryParams.page || 1) + 1)}
              disabled={(queryParams.page || 1) >= Math.ceil(total / (queryParams.pageSize || 25))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create Menu Item Modal */}
      <MenuItemCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleItemCreated}
        categories={categories}
      />

      {/* Edit Menu Item Modal */}
      {selectedItem && (
        <MenuItemCreateModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedItem(null);
          }}
          onSuccess={handleItemUpdated}
          categories={categories}
          editingItem={selectedItem}
        />
      )}
    </div>
  );
}
