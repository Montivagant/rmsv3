/**
 * Category Management Component
 * 
 * Comprehensive category management system with:
 * - Hierarchical tree view with drag-and-drop
 * - CRUD operations for categories
 * - Business rules configuration
 * - Real-time validation and search
 * - Category statistics and analytics
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Input, 
  SmartForm,
  LoadingOverlay,
  SkeletonCard,
  useNotifications
} from './index';
import type { FormField } from './index';
import { useApi, apiPost, apiPatch, apiDelete } from '../hooks/useApi';
import type { ValidationResult } from '../utils/validation';
import { validateName } from '../utils/validation';

// Category types (simplified for UI)
interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  path: string;
  level: number;
  isActive: boolean;
  sortOrder: number;
  rules?: {
    requiresLotTracking?: boolean;
    requiresExpiryTracking?: boolean;
    defaultShelfLifeDays?: number;
    defaultStorage?: {
      location: 'dry' | 'refrigerated' | 'frozen' | 'ambient';
      tempRange?: { min: number; max: number };
    };
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    itemCount?: number;
    childCount?: number;
  };
}

interface CategoryHierarchy {
  category: Category;
  children: CategoryHierarchy[];
  parent?: Category;
}

interface CategoryStats {
  totalCategories: number;
  activeCategories: number;
  maxDepth: number;
  categoriesWithItems: number;
  categoriesWithoutItems: number;
  topLevelCategories: number;
}

interface CategoryManagementProps {
  onCategoryUpdated?: () => void;
  className?: string;
}

export function CategoryManagement({ onCategoryUpdated, className = '' }: CategoryManagementProps) {
  const { data: categories, loading, error, refetch } = useApi<Category[]>('/api/categories');
  const { data: hierarchy, loading: hierarchyLoading, refetch: refetchHierarchy } = useApi<CategoryHierarchy[]>('/api/categories/hierarchy');
  const { data: stats, refetch: refetchStats } = useApi<CategoryStats>('/api/categories/stats');
  const { showSuccess, showError, showLoading, removeNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categories || !searchTerm) return categories || [];
    
    const searchLower = searchTerm.toLowerCase();
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(searchLower) ||
      cat.description?.toLowerCase().includes(searchLower) ||
      cat.path.toLowerCase().includes(searchLower)
    );
  }, [categories, searchTerm]);

  // Category form field definitions
  const categoryFormFields: FormField[] = [
    {
      name: 'name',
      label: 'Category Name',
      type: 'text',
      required: true,
      placeholder: 'Proteins, Vegetables, Beverages...',
      helpText: 'A clear, descriptive name for the category',
      validation: (value: string) => validateName(value)
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      placeholder: 'Brief description of this category...',
      helpText: 'Optional description (up to 200 characters)',
      validation: (value: string) => {
        if (!value) return { isValid: true };
        if (value.length > 200) {
          return { 
            isValid: false, 
            message: 'Description must be 200 characters or less',
            suggestions: [`Current: ${value.length} characters. Try shortening the description.`]
          };
        }
        return { isValid: true };
      }
    },
    {
      name: 'parentId',
      label: 'Parent Category',
      type: 'select',
      required: false,
      helpText: 'Select a parent category to create a subcategory',
      options: categories ? [
        { value: '', label: '-- No Parent (Top Level) --' },
        ...categories
          .filter(cat => cat.isActive)
          .map(cat => ({ 
            value: cat.id, 
            label: `${'  '.repeat(cat.level)}${cat.name}` 
          }))
      ] : []
    },
    {
      name: 'requiresExpiryTracking',
      label: 'Requires Expiry Tracking',
      type: 'select',
      required: false,
      helpText: 'Whether items in this category need expiration date tracking',
      options: [
        { value: '', label: 'Inherit from parent' },
        { value: 'true', label: 'Yes - Track expiry dates' },
        { value: 'false', label: 'No - No expiry tracking' }
      ]
    },
    {
      name: 'defaultShelfLifeDays',
      label: 'Default Shelf Life (Days)',
      type: 'number',
      required: false,
      placeholder: '7',
      helpText: 'Default shelf life for items in this category',
      validation: (value: string) => {
        if (!value) return { isValid: true };
        const days = parseInt(value);
        if (isNaN(days) || days < 1) {
          return { 
            isValid: false, 
            message: 'Shelf life must be a positive number',
            suggestions: ['Enter a number of days (e.g., 7, 30, 365)']
          };
        }
        if (days > 3650) { // 10 years
          return { 
            isValid: false, 
            message: 'Shelf life seems unusually long',
            suggestions: ['Consider if this is correct for food items']
          };
        }
        return { isValid: true };
      }
    },
    {
      name: 'defaultStorage',
      label: 'Default Storage Location',
      type: 'select',
      required: false,
      helpText: 'Default storage requirement for items in this category',
      options: [
        { value: '', label: 'Inherit from parent' },
        { value: 'dry', label: 'Dry Storage' },
        { value: 'refrigerated', label: 'Refrigerated (1-4°C)' },
        { value: 'frozen', label: 'Frozen (-18°C or below)' },
        { value: 'ambient', label: 'Ambient Temperature' }
      ]
    }
  ];

  // Refresh all data after updates
  const refreshData = () => {
    refetch();
    refetchHierarchy();
    refetchStats();
    onCategoryUpdated?.();
  };

  // Create new category
  const createCategory = async (values: Record<string, any>) => {
    const loadingId = showLoading('Creating Category', `Creating "${values.name}"...`);
    setIsSubmitting(true);
    
    try {
      const categoryData = {
        name: values.name,
        description: values.description || undefined,
        parentId: values.parentId || undefined,
        rules: {
          requiresExpiryTracking: values.requiresExpiryTracking ? values.requiresExpiryTracking === 'true' : undefined,
          defaultShelfLifeDays: values.defaultShelfLifeDays ? parseInt(values.defaultShelfLifeDays) : undefined,
          defaultStorage: values.defaultStorage ? { location: values.defaultStorage } : undefined
        }
      };

      // Clean up undefined values
      if (!categoryData.rules.requiresExpiryTracking && !categoryData.rules.defaultShelfLifeDays && !categoryData.rules.defaultStorage) {
        delete categoryData.rules;
      }

      await apiPost('/api/categories', categoryData);
      setShowAddForm(false);
      refreshData();
      
      removeNotification(loadingId);
      showSuccess(
        'Category Created',
        `"${values.name}" has been created successfully`,
        [{ label: 'Add Another', action: () => setShowAddForm(true), style: 'secondary' }]
      );
    } catch (error) {
      removeNotification(loadingId);
      showError(
        'Failed to Create Category',
        `Could not create "${values.name}". Please try again.`,
        [{ label: 'Retry', action: () => createCategory(values), style: 'primary' }]
      );
      console.error('Error creating category:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update existing category
  const updateCategory = async (values: Record<string, any>) => {
    if (!editingCategory) return;
    
    const loadingId = showLoading('Updating Category', `Updating "${editingCategory.name}"...`);
    setIsSubmitting(true);
    
    try {
      const categoryData = {
        name: values.name,
        description: values.description || undefined,
        parentId: values.parentId || undefined,
        rules: {
          requiresExpiryTracking: values.requiresExpiryTracking ? values.requiresExpiryTracking === 'true' : undefined,
          defaultShelfLifeDays: values.defaultShelfLifeDays ? parseInt(values.defaultShelfLifeDays) : undefined,
          defaultStorage: values.defaultStorage ? { location: values.defaultStorage } : undefined
        }
      };

      await apiPatch(`/api/categories/${editingCategory.id}`, categoryData);
      setEditingCategory(null);
      refreshData();
      
      removeNotification(loadingId);
      showSuccess(
        'Category Updated',
        `"${values.name}" has been updated successfully`
      );
    } catch (error) {
      removeNotification(loadingId);
      showError(
        'Failed to Update Category',
        `Could not update "${editingCategory.name}". Please try again.`,
        [{ label: 'Retry', action: () => updateCategory(values), style: 'primary' }]
      );
      console.error('Error updating category:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete/archive category
  const deleteCategory = async (category: Category, reason?: string) => {
    const loadingId = showLoading('Archiving Category', `Archiving "${category.name}"...`);
    
    try {
      await apiDelete(`/api/categories/${category.id}`, reason ? { reason } : undefined);
      setCategoryToDelete(null);
      refreshData();
      
      removeNotification(loadingId);
      showSuccess(
        'Category Archived',
        `"${category.name}" has been archived successfully`
      );
    } catch (error) {
      removeNotification(loadingId);
      showError(
        'Failed to Archive Category',
        `Could not archive "${category.name}". Please try again.`,
        [{ label: 'Retry', action: () => deleteCategory(category, reason), style: 'primary' }]
      );
      console.error('Error archiving category:', error);
    }
  };

  // Toggle category expansion in tree view
  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Render category tree node
  const renderTreeNode = (node: CategoryHierarchy, depth = 0) => {
    const category = node.category;
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const indent = depth * 24;

    return (
      <div key={category.id} className="select-none">
        <div 
          className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
            selectedCategory?.id === category.id 
              ? 'bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          style={{ paddingLeft: `${16 + indent}px` }}
          onClick={() => setSelectedCategory(category)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(category.id);
              }}
              className="mr-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>
          )}
          {!hasChildren && <div className="w-6 mr-2" />}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {category.name}
              </span>
              {category.metadata.itemCount !== undefined && category.metadata.itemCount > 0 && (
                <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                  {category.metadata.itemCount} items
                </span>
              )}
              {!category.isActive && (
                <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full">
                  Archived
                </span>
              )}
            </div>
            {category.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {category.description}
              </p>
            )}
          </div>
          
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setEditingCategory(category);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setCategoryToDelete(category);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700"
            >
              Archive
            </Button>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading && !categories) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} showAvatar={false} lines={3} />
          ))}
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600 dark:text-red-400">Error loading categories: {error}</p>
        <Button onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Category Management</h2>
          <p className="text-gray-600 dark:text-gray-400">Organize your inventory with hierarchical categories</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>Add Category</Button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalCategories}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Categories</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activeCategories}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.maxDepth}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Max Depth</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.topLevelCategories}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Top Level</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.categoriesWithItems}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">With Items</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.categoriesWithoutItems}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Empty</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and View Controls */}
      <div className="flex gap-4">
        <Input
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'tree' ? 'primary' : 'outline'}
            onClick={() => setViewMode('tree')}
          >
            Tree View
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            List View
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardContent className="p-6">
            <SmartForm
              fields={categoryFormFields}
              onSubmit={createCategory}
              onCancel={() => setShowAddForm(false)}
              title="Add New Category"
              description="Create a new category to organize your inventory items"
              submitLabel="Create Category"
              cancelLabel="Cancel"
              autoSave={true}
              autoSaveKey="category-add"
              disabled={isSubmitting}
            />
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      {editingCategory && (
        <Card>
          <CardContent className="p-6">
            <SmartForm
              fields={categoryFormFields}
              onSubmit={updateCategory}
              onCancel={() => setEditingCategory(null)}
              title="Edit Category"
              description={`Update details for "${editingCategory.name}"`}
              submitLabel="Update Category"
              cancelLabel="Cancel"
              disabled={isSubmitting}
              initialValues={{
                name: editingCategory.name,
                description: editingCategory.description || '',
                parentId: editingCategory.parentId || '',
                requiresExpiryTracking: editingCategory.rules?.requiresExpiryTracking?.toString() || '',
                defaultShelfLifeDays: editingCategory.rules?.defaultShelfLifeDays?.toString() || '',
                defaultStorage: editingCategory.rules?.defaultStorage?.location || ''
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Category Display */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'tree' && hierarchy && !hierarchyLoading ? (
            <div className="space-y-1">
              {hierarchy.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📁</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No categories yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create your first category to start organizing your inventory
                  </p>
                  <Button onClick={() => setShowAddForm(true)}>Create First Category</Button>
                </div>
              ) : (
                hierarchy.map(node => renderTreeNode(node))
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No categories found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your search criteria
                  </p>
                </div>
              ) : (
                filteredCategories.map(category => (
                  <div
                    key={category.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedCategory?.id === category.id 
                        ? 'bg-blue-50 dark:bg-blue-900 border-blue-300 dark:border-blue-700' 
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {category.name}
                          </h4>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Level {category.level}
                          </span>
                          {!category.isActive && (
                            <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full">
                              Archived
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {category.path}
                        </p>
                        {category.description && (
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {category.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategory(category);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCategoryToDelete(category);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          Archive
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Details Panel */}
      {selectedCategory && (
        <Card>
          <CardHeader>
            <CardTitle>Category Details: {selectedCategory.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Basic Information</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Path</dt>
                    <dd className="text-sm font-mono text-gray-900 dark:text-gray-100">{selectedCategory.path}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Level</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100">{selectedCategory.level}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Status</dt>
                    <dd className="text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        selectedCategory.isActive 
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                      }`}>
                        {selectedCategory.isActive ? 'Active' : 'Archived'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Items</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100">
                      {selectedCategory.metadata.itemCount || 0} items
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Subcategories</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100">
                      {selectedCategory.metadata.childCount || 0} subcategories
                    </dd>
                  </div>
                </dl>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Business Rules</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Expiry Tracking</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100">
                      {selectedCategory.rules?.requiresExpiryTracking !== undefined 
                        ? selectedCategory.rules.requiresExpiryTracking ? 'Required' : 'Not Required'
                        : 'Inherited'
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Default Shelf Life</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100">
                      {selectedCategory.rules?.defaultShelfLifeDays 
                        ? `${selectedCategory.rules.defaultShelfLifeDays} days`
                        : 'Not Set'
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Storage Location</dt>
                    <dd className="text-sm text-gray-900 dark:text-gray-100">
                      {selectedCategory.rules?.defaultStorage?.location || 'Not Set'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">Archive Category</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Are you sure you want to archive <strong>"{categoryToDelete.name}"</strong>? 
                This will hide it from active use but preserve historical data.
              </p>
              {categoryToDelete.metadata.childCount && categoryToDelete.metadata.childCount > 0 && (
                <p className="mb-4 text-amber-600 dark:text-amber-400 text-sm">
                  ⚠️ This category has {categoryToDelete.metadata.childCount} subcategories. 
                  You must archive them first.
                </p>
              )}
              {categoryToDelete.metadata.itemCount && categoryToDelete.metadata.itemCount > 0 && (
                <p className="mb-4 text-amber-600 dark:text-amber-400 text-sm">
                  ⚠️ This category contains {categoryToDelete.metadata.itemCount} items. 
                  They will need to be moved to another category.
                </p>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setCategoryToDelete(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteCategory(categoryToDelete)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={
                    (categoryToDelete.metadata.childCount && categoryToDelete.metadata.childCount > 0) ||
                    (categoryToDelete.metadata.itemCount && categoryToDelete.metadata.itemCount > 0)
                  }
                >
                  Archive Category
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
