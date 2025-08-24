/**
 * Enhanced Inventory Management Page
 * 
 * Production-ready inventory management with UOM conversions, lot tracking,
 * category integration, and comprehensive business features.
 */

import { useState, useMemo } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Input, 
  SmartForm, 
  LoadingOverlay, 
  SkeletonTable, 
  useNotifications, 
  CategoryManagement,
  RecipeManagement
} from '../components';
import type { FormField } from '../components';
import { useApi, apiPatch, apiPost } from '../hooks/useApi';
import { InventoryDashboard } from '../inventory';
import type { ValidationResult } from '../utils/validation';
import { validateSKU, validateCurrency, validateQuantity, validateName } from '../utils/validation';
import { getCurrentUser } from '../rbac/roles';
import { 
  hasInventoryPermission, 
  INVENTORY_UI_RULES, 
  INVENTORY_ACCESS_LEVELS 
} from '../rbac/inventory-permissions';

// Enhanced Inventory Item Interface (matching our types)
interface EnhancedInventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;
  uom: {
    base: string;
    purchase: string;
    recipe: string;
    conversions: any[];
  };
  storage: {
    locationId?: string;
    requirements?: any;
  };
  tracking: {
    lotTracking: boolean;
    expiryTracking: boolean;
    serialTracking?: boolean;
    trackByLocation: boolean;
  };
  levels: {
    current: number;
    reserved: number;
    available: number;
    onOrder: number;
    par: {
      min: number;
      max: number;
      reorderPoint: number;
      reorderQuantity: number;
    };
  };
  costing: {
    averageCost: number;
    lastCost: number;
    standardCost?: number;
    currency: string;
    costMethod: 'FIFO' | 'LIFO' | 'AVERAGE' | 'STANDARD';
  };
  quality: {
    shelfLifeDays?: number;
    allergens?: string[];
    certifications?: string[];
    hazmat?: boolean;
  };
  suppliers: {
    primary?: any;
    alternatives?: any[];
    preferredSupplier?: string;
  };
  status: 'active' | 'inactive' | 'discontinued' | 'pending';
  flags: {
    isCritical?: boolean;
    isPerishable?: boolean;
    isControlled?: boolean;
    isRecipe?: boolean;
    isRawMaterial?: boolean;
    isFinishedGood?: boolean;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    lastCountDate?: string;
    lastMovementDate?: string;
    notes?: string;
    tags?: string[];
  };
}

interface Category {
  id: string;
  name: string;
  path: string;
  level: number;
  isActive: boolean;
}

interface UnitOfMeasure {
  id: string;
  name: string;
  abbreviation: string;
  type: 'weight' | 'volume' | 'count' | 'length' | 'area';
}

interface StorageLocation {
  id: string;
  name: string;
  type: 'dry' | 'refrigerated' | 'frozen' | 'ambient' | 'controlled';
}

function EnhancedInventory() {
  // Get current user and role for RBAC
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || 'STAFF';
  
  const { data: inventoryResponse, loading, error, refetch } = useApi<{
    items: EnhancedInventoryItem[];
    total: number;
    offset: number;
    limit: number;
  }>('/api/inventory/items');
  
  const { data: categories } = useApi<Category[]>('/api/categories');
  const { data: units } = useApi<UnitOfMeasure[]>('/api/inventory/units');
  const { data: locations } = useApi<StorageLocation[]>('/api/inventory/locations');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('advanced');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const { showSuccess, showError, showLoading, removeNotification } = useNotifications();

  const inventory = inventoryResponse?.items || [];

  // Get unique categories from the enhanced data
  const categoryOptions = useMemo(() => {
    const options = [{ value: 'All', label: 'All Categories' }];
    if (categories) {
      options.push(...categories
        .filter(cat => cat.isActive)
        .map(cat => ({ value: cat.id, label: cat.name }))
      );
    }
    return options;
  }, [categories]);

  // Get unit options
  const unitOptions = useMemo(() => {
    if (!units) return [];
    return units.map(unit => ({ value: unit.id, label: `${unit.name} (${unit.abbreviation})` }));
  }, [units]);

  // Get location options
  const locationOptions = useMemo(() => {
    if (!locations) return [];
    return [
      { value: '', label: '-- No specific location --' },
      ...locations.map(loc => ({ value: loc.id, label: `${loc.name} (${loc.type})` }))
    ];
  }, [locations]);

  // Get existing SKUs for validation
  const existingSKUs = useMemo(() => {
    return inventory?.map(item => item.sku.toUpperCase()) || [];
  }, [inventory]);

  // Enhanced inventory form fields
  const enhancedInventoryFormFields: FormField[] = [
    {
      name: 'name',
      label: 'Item Name',
      type: 'text',
      required: true,
      placeholder: 'Ground Beef 80/20, Roma Tomatoes...',
      helpText: 'A clear, descriptive name for the inventory item',
      validation: (value: string) => validateName(value)
    },
    {
      name: 'sku',
      label: 'SKU (Stock Keeping Unit)',
      type: 'text',
      required: true,
      placeholder: 'BEEF-001, TOMATO-ROMA',
      helpText: 'Unique identifier (letters, numbers, underscore, hyphen only)',
      validation: (value: string) => validateSKU(value, existingSKUs)
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      placeholder: 'Fresh ground beef, 80% lean, 20% fat...',
      helpText: 'Optional detailed description of the item'
    },
    {
      name: 'categoryId',
      label: 'Category',
      type: 'select',
      required: true,
      helpText: 'Select the category for this item',
      options: categoryOptions.filter(opt => opt.value !== 'All')
    },
    {
      name: 'baseUnit',
      label: 'Base Unit (Storage)',
      type: 'select',
      required: true,
      helpText: 'Primary unit for inventory tracking',
      options: unitOptions
    },
    {
      name: 'purchaseUnit',
      label: 'Purchase Unit',
      type: 'select',
      required: true,
      helpText: 'Unit used when purchasing from suppliers',
      options: unitOptions
    },
    {
      name: 'recipeUnit',
      label: 'Recipe Unit',
      type: 'select',
      required: true,
      helpText: 'Unit used in recipes and preparation',
      options: unitOptions
    },
    {
      name: 'initialQuantity',
      label: 'Initial Quantity',
      type: 'number',
      required: true,
      placeholder: '0',
      helpText: 'Starting inventory count in base units',
      validation: (value: string) => validateQuantity(value, { maxStock: 10000 })
    },
    {
      name: 'minLevel',
      label: 'Minimum Stock Level',
      type: 'number',
      required: true,
      placeholder: '5',
      helpText: 'Minimum stock before triggering low stock alerts',
      validation: (value: string, allValues: Record<string, any>) => {
        const result = validateQuantity(value, { maxStock: 1000 });
        if (!result.isValid) return result;
        const maxLevel = parseInt(allValues.maxLevel || '0');
        const minLevel = parseInt(value || '0');
        if (maxLevel > 0 && minLevel >= maxLevel) {
          return { 
            isValid: false, 
            message: 'Minimum level must be less than maximum level',
            suggestions: [`Try: ${Math.floor(maxLevel * 0.3)} (30% of max level)`]
          };
        }
        return { isValid: true };
      }
    },
    {
      name: 'maxLevel',
      label: 'Maximum Stock Level',
      type: 'number',
      required: true,
      placeholder: '100',
      helpText: 'Maximum stock level for optimal inventory management',
      validation: (value: string) => validateQuantity(value, { maxStock: 10000 })
    },
    {
      name: 'reorderPoint',
      label: 'Reorder Point',
      type: 'number',
      required: true,
      placeholder: '10',
      helpText: 'Stock level that triggers reorder suggestions',
      validation: (value: string, allValues: Record<string, any>) => {
        const result = validateQuantity(value, { maxStock: 1000 });
        if (!result.isValid) return result;
        const minLevel = parseInt(allValues.minLevel || '0');
        const reorderPoint = parseInt(value || '0');
        if (minLevel > 0 && reorderPoint < minLevel) {
          return { 
            isValid: false, 
            message: 'Reorder point should not be below minimum level',
            suggestions: [`Try: ${minLevel + 5} (minimum level + buffer)`]
          };
        }
        return { isValid: true };
      }
    },
    {
      name: 'reorderQuantity',
      label: 'Reorder Quantity',
      type: 'number',
      required: true,
      placeholder: '25',
      helpText: 'Typical quantity to order when restocking',
      validation: (value: string) => validateQuantity(value, { maxStock: 1000 })
    },
    {
      name: 'averageCost',
      label: 'Average Cost per Unit',
      type: 'currency',
      required: true,
      placeholder: '0.00',
      helpText: 'Average cost per base unit for valuation',
      validation: (value: string) => validateCurrency(value)
    },
    {
      name: 'locationId',
      label: 'Storage Location',
      type: 'select',
      required: false,
      helpText: 'Primary storage location for this item',
      options: locationOptions
    },
    {
      name: 'lotTracking',
      label: 'Lot/Batch Tracking',
      type: 'select',
      required: false,
      helpText: 'Track individual lots or batches',
      options: [
        { value: 'false', label: 'No lot tracking' },
        { value: 'true', label: 'Enable lot tracking' }
      ]
    },
    {
      name: 'expiryTracking',
      label: 'Expiry Date Tracking',
      type: 'select',
      required: false,
      helpText: 'Track expiration dates for perishable items',
      options: [
        { value: 'false', label: 'No expiry tracking' },
        { value: 'true', label: 'Enable expiry tracking' }
      ]
    },
    {
      name: 'shelfLifeDays',
      label: 'Shelf Life (Days)',
      type: 'number',
      required: false,
      placeholder: '7',
      helpText: 'Typical shelf life in days (optional)',
      validation: (value: string) => {
        if (!value) return { isValid: true };
        const days = parseInt(value);
        if (isNaN(days) || days < 1) {
          return { 
            isValid: false, 
            message: 'Shelf life must be a positive number',
            suggestions: ['Enter number of days (e.g., 7, 30, 365)']
          };
        }
        return { isValid: true };
      }
    },
    {
      name: 'isPerishable',
      label: 'Perishable Item',
      type: 'select',
      required: false,
      helpText: 'Does this item spoil or expire?',
      options: [
        { value: 'false', label: 'Non-perishable' },
        { value: 'true', label: 'Perishable' }
      ]
    },
    {
      name: 'isCritical',
      label: 'Critical Item',
      type: 'select',
      required: false,
      helpText: 'Is this a critical item for operations?',
      options: [
        { value: 'false', label: 'Standard item' },
        { value: 'true', label: 'Critical item' }
      ]
    }
  ];

  // Add enhanced inventory item
  const addEnhancedItem = async (values: Record<string, any>) => {
    const loadingId = showLoading('Adding Inventory Item', `Creating "${values.name}"...`);
    setIsAddingItem(true);
    
    try {
      const itemData = {
        name: values.name,
        sku: values.sku,
        description: values.description || '',
        categoryId: values.categoryId,
        uom: {
          base: values.baseUnit,
          purchase: values.purchaseUnit,
          recipe: values.recipeUnit,
          conversions: []
        },
        storage: {
          locationId: values.locationId || undefined
        },
        tracking: {
          lotTracking: values.lotTracking === 'true',
          expiryTracking: values.expiryTracking === 'true',
          serialTracking: false,
          trackByLocation: false
        },
        levels: {
          current: parseInt(values.initialQuantity),
          reserved: 0,
          available: parseInt(values.initialQuantity),
          onOrder: 0,
          par: {
            min: parseInt(values.minLevel),
            max: parseInt(values.maxLevel),
            reorderPoint: parseInt(values.reorderPoint),
            reorderQuantity: parseInt(values.reorderQuantity)
          }
        },
        costing: {
          averageCost: parseFloat(values.averageCost),
          lastCost: parseFloat(values.averageCost),
          currency: 'USD',
          costMethod: 'AVERAGE'
        },
        quality: {
          shelfLifeDays: values.shelfLifeDays ? parseInt(values.shelfLifeDays) : undefined
        },
        flags: {
          isPerishable: values.isPerishable === 'true',
          isCritical: values.isCritical === 'true',
          isRawMaterial: true,
          isFinishedGood: false
        },
        status: 'active'
      };

      await apiPost('/api/inventory/items', itemData);
      setShowAddForm(false);
      refetch();
      
      removeNotification(loadingId);
      showSuccess(
        'Inventory Item Added',
        `"${values.name}" (${values.sku}) has been added with ${values.initialQuantity} ${values.baseUnit}`,
        [{ label: 'Add Another', action: () => setShowAddForm(true), style: 'secondary' }]
      );
    } catch (error) {
      removeNotification(loadingId);
      showError(
        'Failed to Add Item',
        `Could not add "${values.name}" to inventory. Please try again.`,
        [{ label: 'Try Again', action: () => addEnhancedItem(values), style: 'primary' }]
      );
      console.error('Error adding inventory item:', error);
      throw error;
    } finally {
      setIsAddingItem(false);
    }
  };

  // Adjust stock using the enhanced API
  const adjustStock = async (itemId: string, adjustment: number, reason: string) => {
    const item = inventory?.find(i => i.id === itemId);
    const loadingId = showLoading(
      'Adjusting Stock', 
      `${adjustment > 0 ? 'Adding' : 'Removing'} ${Math.abs(adjustment)} ${item?.uom.base || 'units'} ${adjustment > 0 ? 'to' : 'from'} ${item?.name || 'item'}...`
    );
    
    try {
      setUpdatingItem(itemId);
      await apiPost(`/api/inventory/items/${itemId}/adjust`, { 
        adjustment, 
        reason 
      });
      refetch();
      
      removeNotification(loadingId);
      showSuccess(
        'Stock Adjusted',
        `${item?.name || 'Item'} stock ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)} ${item?.uom.base || 'units'}`
      );
    } catch (error) {
      removeNotification(loadingId);
      showError(
        'Adjustment Failed',
        `Failed to adjust ${item?.name || 'item'} stock. Please try again.`,
        [{ label: 'Retry', action: () => adjustStock(itemId, adjustment, reason), style: 'primary' }]
      );
      console.error('Error adjusting stock:', error);
    } finally {
      setUpdatingItem(null);
    }
  };

  // Filter inventory based on search and category
  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || item.categoryId === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventory, searchTerm, selectedCategory, selectedStatus]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!inventory) return { total: 0, lowStock: 0, belowReorder: 0, totalValue: 0 };
    
    return {
      total: inventory.length,
      lowStock: inventory.filter(item => item.levels.current <= item.levels.par.min).length,
      belowReorder: inventory.filter(item => item.levels.current <= item.levels.par.reorderPoint).length,
      totalValue: inventory.reduce((sum, item) => sum + (item.levels.current * item.costing.averageCost), 0)
    };
  }, [inventory]);

  if (loading && !inventory) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          ))}
        </div>
        
        <SkeletonTable rows={8} columns={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Error loading inventory: {error}</p>
        <Button onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with RBAC Role Indicator */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Enhanced Inventory Management</h1>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              userRole === 'TECH_ADMIN' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              userRole === 'ADMIN' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
              'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            }`}>
              {INVENTORY_ACCESS_LEVELS[userRole]?.name || 'Basic Access'}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {INVENTORY_ACCESS_LEVELS[userRole]?.description || 'View stock levels and report issues'}
          </p>
        </div>
        {INVENTORY_UI_RULES.showAddItemButton(userRole) && (
          <Button onClick={() => setShowAddForm(true)}>Add Inventory Item</Button>
        )}
      </div>

      {/* Summary Statistics with RBAC Controls */}
      <div className={`grid gap-4 ${
        INVENTORY_UI_RULES.showFinancialMetrics(userRole) 
          ? 'grid-cols-1 md:grid-cols-4' 
          : 'grid-cols-1 md:grid-cols-3'
      }`}>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summaryStats.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summaryStats.lowStock}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Low Stock</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summaryStats.belowReorder}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Below Reorder</div>
          </CardContent>
        </Card>
        {INVENTORY_UI_RULES.showFinancialMetrics(userRole) && (
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">${summaryStats.totalValue.toFixed(2)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Value</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardContent className="p-6">
            <SmartForm
              fields={enhancedInventoryFormFields}
              onSubmit={addEnhancedItem}
              onCancel={() => setShowAddForm(false)}
              title="Add New Inventory Item"
              description="Create a comprehensive inventory item with all business attributes"
              submitLabel="Add Item"
              cancelLabel="Cancel"
              autoSave={true}
              autoSaveKey="enhanced-inventory-add-item"
              disabled={isAddingItem}
              initialValues={{ 
                baseUnit: 'piece',
                purchaseUnit: 'piece', 
                recipeUnit: 'piece',
                initialQuantity: 0, 
                minLevel: 5,
                maxLevel: 50,
                reorderPoint: 10,
                reorderQuantity: 25,
                averageCost: 0,
                lotTracking: 'false',
                expiryTracking: 'false',
                isPerishable: 'false',
                isCritical: 'false'
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Enhanced Inventory Tabs */}
      <Card>
        <CardContent className="p-0">
          <div>
            {/* Tab Navigation with RBAC Controls */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex">
                {/* Advanced Dashboard - Available to all roles */}
                <button
                  role="tab"
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'advanced' 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  aria-selected={activeTab === 'advanced'}
                  onClick={() => setActiveTab('advanced')}
                >
                  📊 Dashboard
                </button>
                
                {/* Enhanced Inventory - Available to all roles */}
                <button
                  role="tab"
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === 'enhanced' 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  aria-selected={activeTab === 'enhanced'}
                  onClick={() => setActiveTab('enhanced')}
                >
                  📦 Inventory
                </button>
                
                {/* Categories - Available to ADMIN and TECH_ADMIN */}
                {INVENTORY_UI_RULES.showCategoriesTab(userRole) && (
                  <button
                    role="tab"
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'categories' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    aria-selected={activeTab === 'categories'}
                    onClick={() => setActiveTab('categories')}
                  >
                    🏷️ Categories
                  </button>
                )}
                
                {/* Recipes & BOM - Available to TECH_ADMIN only */}
                {INVENTORY_UI_RULES.showRecipesTab(userRole) && (
                  <button
                    role="tab"
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'recipes' 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    aria-selected={activeTab === 'recipes'}
                    onClick={() => setActiveTab('recipes')}
                  >
                    🍽️ Recipes & BOM
                  </button>
                )}
              </nav>
            </div>
            
            {/* Tab Content with RBAC Controls */}
            <div role="tabpanel" className="p-0">
              {activeTab === 'advanced' ? (
                <div className="p-6">
                  <InventoryDashboard />
                </div>
              ) : activeTab === 'categories' && INVENTORY_UI_RULES.showCategoriesTab(userRole) ? (
                <div className="p-6">
                  <CategoryManagement onCategoryUpdated={() => {
                    refetch();
                  }} />
                </div>
              ) : activeTab === 'recipes' && INVENTORY_UI_RULES.showRecipesTab(userRole) ? (
                <div className="p-6">
                  <RecipeManagement onRecipeUpdated={() => {
                    // Refresh inventory data when recipes are updated
                    refetch();
                  }} />
                </div>
              ) : (
                <div className="p-6">
                  <EnhancedInventoryView 
                    inventory={filteredInventory}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    selectedStatus={selectedStatus}
                    setSelectedStatus={setSelectedStatus}
                    categoryOptions={categoryOptions}
                    onAdjustStock={adjustStock}
                    updatingItem={updatingItem}
                    loading={loading}
                    userRole={userRole}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Enhanced Inventory View Component
interface EnhancedInventoryViewProps {
  inventory: EnhancedInventoryItem[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  categoryOptions: Array<{ value: string; label: string }>;
  onAdjustStock: (itemId: string, adjustment: number, reason: string) => Promise<void>;
  updatingItem: string | null;
  loading: boolean;
}

function EnhancedInventoryView({
  inventory,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedStatus,
  setSelectedStatus,
  categoryOptions,
  onAdjustStock,
  updatingItem,
  loading
}: EnhancedInventoryViewProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded flex-1 animate-pulse"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
        </div>
        <SkeletonTable rows={8} columns={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categoryOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="active">Active Items</option>
          <option value="all">All Items</option>
          <option value="inactive">Inactive</option>
          <option value="discontinued">Discontinued</option>
        </select>
      </div>

      {/* Enhanced Inventory Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock Levels</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">UOM</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tracking</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {inventory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.name}
                      </div>
                      {item.flags.isCritical && (
                        <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Critical</span>
                      )}
                      {item.flags.isPerishable && (
                        <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Perishable</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">SKU: {item.sku}</div>
                    {item.description && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs">{item.description}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-gray-100">{item.categoryId}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Current: {item.levels.current}</span>
                      {item.levels.current <= item.levels.par.min && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Low</span>
                      )}
                      {item.levels.current <= item.levels.par.reorderPoint && item.levels.current > item.levels.par.min && (
                        <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">Reorder</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Min: {item.levels.par.min} | Max: {item.levels.par.max} | Reorder: {item.levels.par.reorderPoint}
                    </div>
                    <div className="text-xs text-gray-500">
                      Available: {item.levels.available} | Reserved: {item.levels.reserved}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs space-y-1">
                    <div>Base: {item.uom.base}</div>
                    <div>Purchase: {item.uom.purchase}</div>
                    <div>Recipe: {item.uom.recipe}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm space-y-1">
                    <div>Avg: ${item.costing.averageCost.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Last: ${item.costing.lastCost.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">Value: ${(item.levels.current * item.costing.averageCost).toFixed(2)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs space-y-1">
                    {item.tracking.lotTracking && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Lot</span>
                    )}
                    {item.tracking.expiryTracking && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">Expiry</span>
                    )}
                    {!item.tracking.lotTracking && !item.tracking.expiryTracking && (
                      <span className="text-gray-400">None</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAdjustStock(item.id, 1, 'Manual adjustment')}
                      disabled={updatingItem === item.id}
                      className="px-2 py-1 text-xs"
                    >
                      +1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAdjustStock(item.id, -1, 'Manual adjustment')}
                      disabled={updatingItem === item.id || item.levels.current <= 0}
                      className="px-2 py-1 text-xs"
                    >
                      -1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const adjustment = prompt('Enter adjustment amount (+ to add, - to remove):');
                        if (adjustment !== null && !isNaN(Number(adjustment))) {
                          onAdjustStock(item.id, Number(adjustment), 'Manual bulk adjustment');
                        }
                      }}
                      disabled={updatingItem === item.id}
                      className="px-2 py-1 text-xs"
                    >
                      Adjust
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inventory.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No inventory items found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || selectedCategory !== 'All' 
              ? 'Try adjusting your search or filter criteria'
              : 'Add your first inventory item to get started'
            }
          </p>
        </div>
      )}
    </div>
  );
}

export default EnhancedInventory;
