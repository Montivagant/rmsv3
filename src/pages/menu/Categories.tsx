/**
 * Menu Categories Management
 * Lightweight view for reviewing, creating, and editing menu categories.
 */

import { useMemo, useState, useCallback } from 'react';
import { Button } from '../../components/Button';
import { Card, CardContent } from '../../components/Card';
import { Input } from '../../components/Input';
import { Badge } from '../../components/Badge';
import { DataTable } from '../../components/inventory/DataTable';
import { useToast } from '../../hooks/useToast';
import { useRepository, useRepositoryMutation } from '../../hooks/useRepository';
import {
  listCategories,
  deleteCategory,
  type MenuCategory,
} from '../../menu/categories/repository';
import CategoryCreateModal from '../../components/menu/CategoryCreateModal';
import { formatDate } from '../../lib/format';

export default function Categories() {
  const { showToast } = useToast();
  const { data: categoriesData, loading, refetch } = useRepository<MenuCategory[]>(listCategories, []);
  const categories = useMemo(() => categoriesData ?? [], [categoriesData]);
  const deleteCategoryMutation = useRepositoryMutation((id: string) => deleteCategory(id));

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const term = searchTerm.toLowerCase();
    return categories.filter((category) => category.name.toLowerCase().includes(term));
  }, [categories, searchTerm]);

  const handleCreate = useCallback(() => {
    setEditingCategory(null);
    setIsModalOpen(true);
  }, []);

  const handleEdit = useCallback((category: MenuCategory) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (category: MenuCategory) => {
      if (!confirm(`Delete category "${category.name}"?`)) return;
      setIsDeleting(true);
      try {
        await deleteCategoryMutation.mutate(category.id);
        showToast({ title: 'Category deleted', variant: 'success' });
        refetch();
      } catch (error) {
        const err = error instanceof Error ? error : undefined;
        showToast({ title: 'Error', description: err?.message ?? 'Failed to delete category', variant: 'error' });
      } finally {
        setIsDeleting(false);
      }
    },
    [deleteCategoryMutation, refetch, showToast],
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingCategory(null);
  }, []);

  const handleModalSuccess = useCallback(() => {
    handleModalClose();
    refetch();
    showToast({ title: 'Category saved', variant: 'success' });
  }, [handleModalClose, refetch, showToast]);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Name',
        accessor: (category: MenuCategory) => (
          <div>
            <div className="font-semibold text-text-primary">{category.name}</div>
            <div className="text-xs text-text-secondary">Order: {category.displayOrder}</div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        accessor: (category: MenuCategory) => (
          <Badge variant={category.isActive ? 'success' : 'secondary'} size="sm">
            {category.isActive ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
      {
        key: 'branches',
        header: 'Branches',
        accessor: (category: MenuCategory) => (
          <span className="text-sm text-text-secondary">{category.branchIds.length} linked</span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        accessor: (category: MenuCategory) => (
          <span className="text-sm text-text-secondary">{formatDate(category.createdAt.getTime())}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        accessor: (category: MenuCategory) => (
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-error-600"
              onClick={() => handleDelete(category)}
              disabled={isDeleting}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [handleDelete, handleEdit, isDeleting],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Menu Categories</h1>
            <p className="text-sm text-text-secondary">
              Organise your menu by grouping items into manageable categories.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              placeholder="Search categories"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="md:w-64"
            />
            <Button onClick={handleCreate}>New Category</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <DataTable
            data={filteredCategories}
            columns={columns}
            keyExtractor={(category) => category.id}
            loading={loading}
            emptyState={{
              title: 'No categories found',
              description: searchTerm
                ? 'Try adjusting your search term.'
                : 'Create your first category to get started.',
              action: {
                label: 'Add Category',
                onClick: handleCreate,
              },
            }}
          />
        </CardContent>
      </Card>

      {isModalOpen && (
        <CategoryCreateModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          editingCategory={editingCategory}
        />
      )}
    </div>
  );
}


