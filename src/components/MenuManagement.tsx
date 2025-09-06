/**
 * Menu Management Component
 * 
 * Comprehensive CRUD operations for menu items including:
 * - Add/Edit/Delete menu items
 * - Category management
 * - Real-time validation
 * - Search and filtering
 * - Bulk operations
 */

import { useState, useMemo } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Input, 
  Select, 
  SmartForm,
  SkeletonCard,
  useNotifications
} from './index';
import type { FormField } from './forms/SmartForm';
import { useApi, apiPost, apiPatch, apiDelete } from '../hooks/useApi';
import { 
  validateMenuItemName, 
  validateMenuItemDescription, 
  validateMenuItemPrice, 
  validateMenuItemCategory 
} from '../utils/validation';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
}

interface MenuManagementProps {
  onItemUpdated?: () => void;
  className?: string;
}

export function MenuManagement({ onItemUpdated, className = '' }: MenuManagementProps) {
  const { data: menuItems, loading, error, refetch } = useApi<MenuItem[]>('/api/menu');
  const { showSuccess, showError, showLoading, removeNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  // Get unique categories for filtering
  const categories = useMemo(() => {
    if (!menuItems) return [];
    const uniqueCategories = [...new Set(menuItems.map(item => item.category))];
    return ['All', ...uniqueCategories];
  }, [menuItems]);

  // Get existing categories for validation
  const existingCategories = useMemo(() => {
    if (!menuItems) return [];
    return [...new Set(menuItems.map(item => item.category))];
  }, [menuItems]);

  // Filter menu items based on search and category
  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchTerm, selectedCategory]);

  // Form field definitions for menu items
  const menuItemFormFields: FormField[] = [
    {
      name: 'name',
      label: 'Item Name',
      type: 'text',
      required: true,
      placeholder: 'Classic Burger, Fresh Coffee...',
      helpText: 'A clear, descriptive name for the menu item',
      validationRules: [{
        id: 'menu-item-name',
        message: 'Invalid menu item name',
        validate: (value: string) => validateMenuItemName(value)
      }]
    },
    {
      name: 'price',
      label: 'Price',
      type: 'currency',
      required: true,
      placeholder: '9.99',
      helpText: 'Price in dollars (e.g., 12.50)',
      validationRules: [{
        id: 'menu-item-price',
        message: 'Invalid price',
        validate: (value: string) => validateMenuItemPrice(value)
      }]
    },
    {
      name: 'category',
      label: 'Category',
      type: existingCategories.length > 0 ? 'select' : 'text',
      required: true,
      helpText: 'Product category for organization',
      options: existingCategories.length > 0 ? [
        ...existingCategories.map(cat => ({ value: cat, label: cat })),
        { value: '__new__', label: '+ Add New Category' }
      ] : undefined,
      placeholder: existingCategories.length === 0 ? 'Main, Sides, Drinks...' : undefined,
      validationRules: [{
        id: 'menu-item-category',
        message: 'Invalid category',
        validate: (value: string) => validateMenuItemCategory(value, existingCategories)
      }]
    },
    {
      name: 'newCategory',
      label: 'New Category Name',
      type: 'text',
      required: false,
      placeholder: 'Enter new category name',
      helpText: 'Create a new category for this item',
      visible: (allValues: Record<string, any>) => allValues.category === '__new__',
      validationRules: [{
        id: 'new-category',
        message: 'Invalid new category name',
        validate: (value: string, formData?: Record<string, unknown>) => {
          if (formData?.category === '__new__') {
            return validateMenuItemCategory(value, existingCategories);
          }
          return { isValid: true };
        }
      }]
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      placeholder: 'Brief description of the menu item...',
      helpText: 'Optional description (up to 200 characters)',
      validationRules: [{
        id: 'menu-item-description',
        message: 'Invalid description',
        validate: (value: string) => validateMenuItemDescription(value)
      }]
    }
  ];

  const addMenuItem = async (values: Record<string, any>) => {
    const loadingId = showLoading('Adding Menu Item', `Creating "${values.name}"...`);
    setIsSubmitting(true);
    
    try {
      // Handle new category creation
      const category = values.category === '__new__' ? values.newCategory : values.category;
      
      const itemData = {
        name: values.name,
        price: parseFloat(values.price),
        category,
        description: values.description || '',
        image: '/api/placeholder/150/150' // Default image
      };

      await apiPost('/api/menu', itemData);
      setShowAddForm(false);
      refetch();
      onItemUpdated?.();
      
      removeNotification(loadingId);
      showSuccess(
        'Menu Item Added',
        `"${values.name}" has been added to the ${category} category`,
        [{ label: 'Add Another', action: () => setShowAddForm(true), style: 'secondary' }]
      );
    } catch (error) {
      removeNotification(loadingId);
      showError(
        'Failed to Add Item',
        `Could not add "${values.name}" to the menu. Please try again.`,
        [{ label: 'Retry', action: () => addMenuItem(values), style: 'primary' }]
      );
      console.error('Error adding menu item:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const editMenuItem = async (values: Record<string, any>) => {
    if (!editingItem) return;
    
    const loadingId = showLoading('Updating Menu Item', `Updating "${editingItem.name}"...`);
    setIsSubmitting(true);
    
    try {
      // Handle new category creation
      const category = values.category === '__new__' ? values.newCategory : values.category;
      
      const itemData = {
        name: values.name,
        price: parseFloat(values.price),
        category,
        description: values.description || ''
      };

      await apiPatch(`/api/menu/${editingItem.id}`, itemData);
      setEditingItem(null);
      refetch();
      onItemUpdated?.();
      
      removeNotification(loadingId);
      showSuccess(
        'Menu Item Updated',
        `"${values.name}" has been updated successfully`,
        [{ label: 'Edit Another', action: () => {}, style: 'secondary' }]
      );
    } catch (error) {
      removeNotification(loadingId);
      showError(
        'Failed to Update Item',
        `Could not update "${editingItem.name}". Please try again.`,
        [{ label: 'Retry', action: () => editMenuItem(values), style: 'primary' }]
      );
      console.error('Error updating menu item:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteMenuItem = async (item: MenuItem) => {
    const loadingId = showLoading('Deleting Menu Item', `Removing "${item.name}"...`);
    
    try {
      await apiDelete(`/api/menu/${item.id}`);
      setItemToDelete(null);
      refetch();
      onItemUpdated?.();
      
      removeNotification(loadingId);
      showSuccess(
        'Menu Item Deleted',
        `"${item.name}" has been removed from the menu`
      );
    } catch (error) {
      removeNotification(loadingId);
      showError(
        'Failed to Delete Item',
        `Could not delete "${item.name}". Please try again.`,
        [{ label: 'Retry', action: () => deleteMenuItem(item), style: 'primary' }]
      );
      console.error('Error deleting menu item:', error);
    }
  };

  const confirmDelete = (item: MenuItem) => {
    setItemToDelete(item);
  };

  const startEdit = (item: MenuItem) => {
    setEditingItem(item);
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-surface-secondary rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-surface-secondary rounded w-96 animate-pulse"></div>
          </div>
          <div className="h-10 bg-surface-secondary rounded w-32 animate-pulse"></div>
        </div>
        
        <div className="flex gap-4">
          <div className="h-10 bg-surface-secondary rounded flex-1 animate-pulse"></div>
          <div className="h-10 bg-surface-secondary rounded w-32 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} showAvatar={false} lines={4} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600 dark:text-red-400">Error loading menu items: {error}</p>
        <Button onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Menu Management</h2>
          <p className="text-gray-600 dark:text-gray-400">Add, edit, and organize your menu items</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>Add Menu Item</Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <Input
          placeholder="Search menu items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          options={categories.map(cat => ({ value: cat, label: cat }))}
          className="w-48"
        />
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardContent className="p-6">
            <SmartForm
              fields={menuItemFormFields}
              onSubmit={addMenuItem}
              onCancel={() => setShowAddForm(false)}
              title="Add New Menu Item"
              description="Create a new menu item with detailed information and pricing"
              submitLabel="Add Menu Item"
              cancelLabel="Cancel"
              autoSave={true}
              autoSaveKey="menu-add-item"
              disabled={isSubmitting}
              initialValues={{ 
                category: existingCategories.length > 0 ? existingCategories[0] : '',
                price: 0 
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      {editingItem && (
        <Card>
          <CardContent className="p-6">
            <SmartForm
              fields={menuItemFormFields}
              onSubmit={editMenuItem}
              onCancel={() => setEditingItem(null)}
              title="Edit Menu Item"
              description={`Update details for "${editingItem.name}"`}
              submitLabel="Update Menu Item"
              cancelLabel="Cancel"
              disabled={isSubmitting}
              initialValues={{
                name: editingItem.name,
                price: editingItem.price,
                category: editingItem.category,
                description: editingItem.description || ''
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <Card key={item.id} className="overflow-hidden">
            <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400 text-4xl">🍽️</div>
              )}
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="flex justify-between items-start">
                <span className="text-lg">{item.name}</span>
                <span className="text-lg font-bold text-success">
                  ${item.price.toFixed(2)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Category: <span className="font-medium">{item.category}</span>
                </p>
                {item.description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {item.description}
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startEdit(item)}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => confirmDelete(item)}
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🍽️</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {searchTerm || selectedCategory !== 'All' ? 'No items found' : 'No menu items yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm || selectedCategory !== 'All' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first menu item'
            }
          </p>
          {(!searchTerm && selectedCategory === 'All') && (
            <Button onClick={() => setShowAddForm(true)}>Add Your First Menu Item</Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">Delete Menu Item</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Are you sure you want to delete <strong>"{itemToDelete.name}"</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setItemToDelete(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteMenuItem(itemToDelete)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete Item
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Summary */}
      {filteredItems.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Showing {filteredItems.length} of {menuItems?.length || 0} menu items
          {selectedCategory !== 'All' && ` in ${selectedCategory}`}
        </div>
      )}
    </div>
  );
}
