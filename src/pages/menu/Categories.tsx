/**
 * Menu Categories Management Page
 * CRUD interface for menu categories with search, filtering, and bulk operations
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '../../components/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { Skeleton } from '../../components/Skeleton';
import { DropdownMenu, DropdownMenuItem } from '../../components/DropdownMenu';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { cn } from '../../lib/utils';
import { ADMIN_ICONS } from '../../config/admin-nav.config';
import CategoryCreateModal from '../../components/menu/CategoryCreateModal';
import type { 
  MenuCategory, 
  CategoryQuery, 
  CategoriesResponse 
} from '../../menu/categories/types';
import { menuCategoriesApi } from '../../menu/categories/api';

export default function Categories() {
  const { showToast } = useToast();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [queryParams, setQueryParams] = useState<CategoryQuery>({
    page: 1,
    pageSize: 25,
    sortBy: 'displayOrder',
    sortOrder: 'asc'
  });

  // API call with query parameters
  const categoriesUrl = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });
    if (searchTerm) {
      params.set('search', searchTerm);
    }
    return `/api/menu/categories?${params.toString()}`;
  }, [queryParams, searchTerm]);

  const { data: categoriesResponse, loading, error, refetch } = useApi<CategoriesResponse>(categoriesUrl);

  const categories = categoriesResponse?.categories || [];
  const total = categoriesResponse?.total || 0;

  // Event handlers
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
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

  const handleCategoryCreated = useCallback(() => {
    setIsCreateModalOpen(false);
    refetch();
    showToast({
      title: 'Success',
      description: 'Category created successfully',
      variant: 'success'
    });
  }, [refetch, showToast]);

  const handleEditCategory = useCallback((category: MenuCategory) => {
    setSelectedCategory(category);
    setIsEditModalOpen(true);
  }, []);

  const handleCategoryUpdated = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedCategory(null);
    refetch();
    showToast({
      title: 'Success',
      description: 'Category updated successfully',
      variant: 'success'
    });
  }, [refetch, showToast]);

  const handleDeleteCategory = useCallback(async (category: MenuCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await menuCategoriesApi.delete(category.id);

      refetch();
      showToast({
        title: 'Success',
        description: 'Category deleted successfully',
        variant: 'success'
      });
    } catch (error) {
      showToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete category',
        variant: 'error'
      });
    }
  }, [refetch, showToast]);

  // Loading state
  if (loading && categories.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
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
          <p className="text-error mb-4">Failed to load categories</p>
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
          <h1 className="text-h1 text-primary mb-1">Menu Categories</h1>
          <p className="text-body text-secondary">
            Organize your menu items into logical categories
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="min-h-[44px]"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Category
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              {total} {total === 1 ? 'category' : 'categories'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Grid */}
      {categories.length === 0 && !loading ? (
        <EmptyState
          title="No categories found"
          description={searchTerm ? "No categories match your search." : "Create your first menu category to organize items."}
          action={{
            label: "Add Category",
            onClick: () => setIsCreateModalOpen(true)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Card 
              key={category.id}
              className={cn(
                "hover:shadow-md transition-shadow cursor-pointer",
                !category.isActive && "opacity-60"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary mb-1">
                      {category.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <span>Order: {category.displayOrder}</span>
                      <span>•</span>
                      <span>{category.branchIds.length} branches</span>
                    </div>
                  </div>
                  
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
                    <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                      Edit Category
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDeleteCategory(category)}
                      className="text-error"
                    >
                      Delete Category
                    </DropdownMenuItem>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between">
                  <Badge 
                    variant={category.isActive ? 'success' : 'secondary'}
                    size="sm"
                  >
                    {category.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  
                  <span className="text-xs text-text-muted">
                    Created {new Date(category.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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

      {/* Create Category Modal */}
      <CategoryCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCategoryCreated}
      />

      {/* Edit Category Modal */}
      {selectedCategory && (
        <CategoryCreateModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedCategory(null);
          }}
          onSuccess={handleCategoryUpdated}
          editingCategory={selectedCategory}
        />
      )}
    </div>
  );
}