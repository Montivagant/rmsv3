import React, { useState } from 'react';
import { PageHeader } from '../../components/pos/PageHeader';
import { EmptyState } from '../../components/inventory/EmptyState';
import { Button } from '../../components/Button';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import CategoryCreateModal from '../../components/categories/CategoryCreateModal';

interface MenuCategory {
  id: string;
  name: string;
  reference?: string;
  isActive: boolean;
  itemCount?: number;
}

export default function Categories() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: categories = [], loading, error, refetch } = useApi<MenuCategory[]>('/api/menu/categories');
  const { data: existingReferences = [] } = useApi<string[]>('/api/menu/categories/references');
  const { showToast } = useToast();

  // Handle successful category creation
  const handleCategoryCreated = (categoryId: string) => {
    refetch(); // Refresh the category list
    setIsCreateModalOpen(false);
    showToast('Category created successfully', 'success');
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full bg-background">
        <PageHeader 
          title="Menu Categories"
          description="Manage menu categories and subcategories for better organization"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Loading categories...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader 
        title="Menu Categories"
        description="Manage menu categories and subcategories for better organization"
        actions={
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
          >
            Create Category
          </Button>
        }
      />
      
      <div className="flex-1 p-6">
        {categories && categories.length === 0 ? (
          <div className="card p-8">
            <EmptyState
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
              title="No Categories"
              description="Create categories to organize your menu items better."
              action={{
                label: "Create Category",
                onClick: () => setIsCreateModalOpen(true),
                variant: "primary"
              }}
            />
          </div>
        ) : categories && categories.length > 0 ? (
          /* Categories Grid */
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div 
                key={category.id}
                className="p-6 border border-border rounded-lg hover:bg-muted/50 transition-colors card"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-lg">{category.name}</h3>
                    {category.reference && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Reference: {category.reference}
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    category.isActive 
                      ? 'bg-success/10 text-success' 
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="text-2xl font-bold text-primary mb-2">
                  {category.itemCount || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  {category.itemCount === 1 ? 'item' : 'items'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          /* Loading or error state */
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">
              {loading ? 'Loading categories...' : 'No categories found.'}
            </div>
          </div>
        )}
      </div>

      {/* Category Create Modal */}
      <CategoryCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCategoryCreated}
        existingReferences={existingReferences}
        isLoading={loading}
      />
    </div>
  );
}
