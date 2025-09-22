/**
 * Inventory Category Management
 * 
 * Standalone page for managing inventory categories
 */

import { useState, useMemo } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Input, 
  EmptyState
} from '../../components';
import { DataTable } from '../../components';
import { useToast } from '../../hooks/useToast';
import { useRepository } from '../../hooks/useRepository';
import { listInventoryCategories, type InventoryCategory } from '../../inventory/repository';
import { CategoryCreateModal } from '../../components/categories';

// Component-specific interface for display
interface CategoryDisplay {
  id: string;
  name: string;
  reference: string;
  itemCount: number;
  createdAt: string;
}

export default function CategoryManagement() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();

  // Repository hooks
  const { data: rawCategories = [], loading, error, refetch } = useRepository(
    listInventoryCategories,
    []
  );

  // Transform inventory categories to display format
  const categories: CategoryDisplay[] = useMemo(() => 
    (rawCategories || []).map((cat: InventoryCategory) => ({
      id: cat.id,
      name: cat.name,
      reference: cat.description || '',
      itemCount: cat.itemCount || 0,
      createdAt: cat.createdAt ? new Date(cat.createdAt).toISOString() : new Date().toISOString(),
    })),
    [rawCategories]
  );

  // Handle category creation success
  const handleCategoryCreated = (_categoryId: string) => {
    setShowCreateModal(false);
    refetch(); // Refetch categories after creation
    showToast('Category created successfully!', 'success');
  };

  // Filter categories based on search term
  const filteredCategories = useMemo(() => 
    categories.filter(category => 
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.reference.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [categories, searchTerm]
  );

  // Table columns
  const columns = [
    {
      id: 'name',
      accessorKey: 'name' as keyof CategoryDisplay,
      header: 'Name',
      cell: ({ row }: { row: { original: CategoryDisplay } }) => (
        <div className="font-medium">{row.original.name}</div>
      ),
      enableSorting: true,
    },
    {
      id: 'reference',
      accessorKey: 'reference' as keyof CategoryDisplay,
      header: 'Reference',
      cell: ({ row }: { row: { original: CategoryDisplay } }) => (
        <div className="font-mono text-sm">{row.original.reference || '-'}</div>
      ),
      enableSorting: true,
    },
    {
      id: 'itemCount',
      accessorKey: 'itemCount' as keyof CategoryDisplay,
      header: 'Items',
      cell: ({ row }: { row: { original: CategoryDisplay } }) => (
        <div className="text-center">{row.original.itemCount}</div>
      ),
      enableSorting: true,
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt' as keyof CategoryDisplay,
      header: 'Created',
      cell: ({ row }: { row: { original: CategoryDisplay } }) => {
        const date = new Date(row.original.createdAt);
        return (
          <div className="text-sm text-text-secondary">
            {date.toLocaleDateString()}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: { original: CategoryDisplay } }) => (
        <div className="flex justify-end space-x-2">
          <Button size="sm" variant="outline">Edit</Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-error-600 hover:text-error-700"
            disabled={row.original.itemCount > 0}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Inventory Categories</h1>
          <p className="text-text-secondary">
            Manage categories for organizing inventory items
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          Add Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Categories</CardTitle>
            <div className="w-64">
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-text-secondary">
              Loading categories...
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-error-600 mb-4">
                {error && typeof error === 'object' && 'message' in error ? (error as Error).message : 'Failed to load categories'}
              </p>
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          ) : filteredCategories.length === 0 ? (
            <EmptyState
              title={searchTerm ? "No matching categories" : "No categories yet"}
              description={searchTerm 
                ? "Try a different search term" 
                : "Create your first category to organize inventory items"}
              action={{
                label: "Add Category",
                onClick: () => setShowCreateModal(true)
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={filteredCategories}
            />
          )}
        </CardContent>
      </Card>

      {/* Create Category Modal */}
      {showCreateModal && (
        <CategoryCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCategoryCreated}
          existingReferences={categories.map(c => c.reference)}
        />
      )}
    </div>
  );
}
