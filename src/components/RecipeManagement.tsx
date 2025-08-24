/**
 * Recipe Management Component
 * 
 * Comprehensive UI for managing recipes, ingredients, cost analysis,
 * and integration with inventory and menu systems.
 */

import { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { SmartForm } from './forms/SmartForm';
import type { FormField } from './forms/SmartForm';
import { LoadingOverlay, SkeletonCard } from './feedback/LoadingSpinner';
import { useNotifications } from './feedback/NotificationSystem';
import { useApi, apiPost, apiPatch, apiDelete } from '../hooks/useApi';
import type { ValidationResult } from '../utils/validation';
import { validateName, validateQuantity, validateCurrency } from '../utils/validation';
import type {
  Recipe,
  RecipeIngredient,
  RecipeCategory,
  RecipeType,
  RecipeQuery,
  RecipeScale,
  RecipeAnalytics
} from '../recipes/types';
import { RECIPE_CATEGORIES } from '../recipes/types';
import { FaPlus, FaEdit, FaTrash, FaClock, FaDollarSign, FaUsers, FaUtensils, FaInfo, FaExclamationTriangle, FaTags, FaFlask } from 'react-icons/fa';
import { MdRestaurant } from 'react-icons/md';

interface RecipeManagementProps {
  onRecipeUpdated?: () => void;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  uom: {
    base: string;
    recipe: string;
  };
  costing: {
    averageCost: number;
    currency: string;
  };
}

export function RecipeManagement({ onRecipeUpdated }: RecipeManagementProps) {
  const { data: recipesResponse, loading, error, refetch } = useApi<{
    recipes: Recipe[];
    total: number;
    offset: number;
    limit: number;
  }>('/api/recipes');

  const { data: inventoryItems } = useApi<InventoryItem[]>('/api/inventory/items');
  const { data: recipeCategories } = useApi<typeof RECIPE_CATEGORIES>('/api/recipes/categories');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [scalingRecipe, setScalingRecipe] = useState<Recipe | null>(null);
  const [targetYield, setTargetYield] = useState<number>(1);
  const [scaledRecipe, setScaledRecipe] = useState<RecipeScale | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showSuccess, showError, showLoading, removeNotification } = useNotifications();

  const recipes = recipesResponse?.recipes || [];

  // Get category options
  const categoryOptions = useMemo(() => {
    const options = [{ value: 'All', label: 'All Categories' }];
    if (recipeCategories) {
      options.push(...Object.entries(recipeCategories).map(([key, cat]) => ({
        value: key,
        label: `${cat.icon} ${cat.name}`
      })));
    }
    return options;
  }, [recipeCategories]);

  // Get inventory options for ingredients
  const inventoryOptions = useMemo(() => {
    if (!inventoryItems) return [];
    return inventoryItems.map(item => ({
      value: item.id,
      label: `${item.name} (${item.sku}) - $${item.costing.averageCost.toFixed(2)}/${item.uom.recipe}`
    }));
  }, [inventoryItems]);

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];
    
    return recipes.filter(recipe => {
      const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           recipe.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           recipe.metadata.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'All' || recipe.category === selectedCategory;
      const matchesType = selectedType === 'All' || recipe.type === selectedType;
      const matchesDifficulty = selectedDifficulty === 'All' || recipe.difficulty === selectedDifficulty;
      
      return matchesSearch && matchesCategory && matchesType && matchesDifficulty;
    });
  }, [recipes, searchTerm, selectedCategory, selectedType, selectedDifficulty]);

  // Recipe form fields
  const recipeFormFields: FormField[] = [
    {
      name: 'name',
      label: 'Recipe Name',
      type: 'text',
      required: true,
      placeholder: 'Classic Cheeseburger, House Marinara...',
      helpText: 'A clear, descriptive name for the recipe',
      validation: validateName
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      placeholder: 'Brief description of the dish, its characteristics, and appeal...',
      helpText: 'Description that will help staff and customers understand the dish'
    },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      required: true,
      options: categoryOptions.filter(opt => opt.value !== 'All'),
      helpText: 'Primary category for organization and menu grouping'
    },
    {
      name: 'type',
      label: 'Recipe Type',
      type: 'select',
      required: true,
      options: [
        { value: 'finished_dish', label: '🍽️ Finished Dish - Complete menu item' },
        { value: 'component', label: '🧩 Component - Part of other recipes' },
        { value: 'prep_item', label: '🔪 Prep Item - Preparation component' },
        { value: 'base', label: '🏗️ Base Recipe - Foundation for other dishes' },
        { value: 'sauce', label: '🍯 Sauce - Sauce or condiment' },
        { value: 'batch_prep', label: '📦 Batch Prep - Large batch preparation' },
        { value: 'made_to_order', label: '⚡ Made to Order - Individual preparation' },
        { value: 'assembly', label: '🔧 Assembly - No cooking required' }
      ],
      helpText: 'Type of recipe affects how it\'s used in the kitchen'
    },
    {
      name: 'difficulty',
      label: 'Difficulty Level',
      type: 'select',
      required: true,
      options: [
        { value: 'easy', label: '⭐ Easy - Basic skills required' },
        { value: 'medium', label: '⭐⭐ Medium - Intermediate skills' },
        { value: 'hard', label: '⭐⭐⭐ Hard - Advanced skills' },
        { value: 'expert', label: '⭐⭐⭐⭐ Expert - Specialized techniques' }
      ],
      helpText: 'Skill level required to execute this recipe'
    },
    {
      name: 'yieldQuantity',
      label: 'Yield Quantity',
      type: 'number',
      required: true,
      placeholder: '1',
      helpText: 'How much this recipe makes',
      validation: (value: string) => validateQuantity(value, { maxStock: 1000 })
    },
    {
      name: 'yieldUnit',
      label: 'Yield Unit',
      type: 'text',
      required: true,
      placeholder: 'serving, cup, lb, piece...',
      helpText: 'Unit of measurement for the yield'
    },
    {
      name: 'servings',
      label: 'Number of Servings',
      type: 'number',
      required: false,
      placeholder: '1',
      helpText: 'How many servings this recipe provides (if different from yield)',
      validation: (value: string) => {
        if (!value) return { isValid: true };
        return validateQuantity(value, { maxStock: 100 });
      }
    },
    {
      name: 'prepTime',
      label: 'Prep Time (minutes)',
      type: 'number',
      required: true,
      placeholder: '15',
      helpText: 'Time needed for preparation before cooking',
      validation: (value: string) => validateQuantity(value, { maxStock: 480 })
    },
    {
      name: 'cookTime',
      label: 'Cook Time (minutes)',
      type: 'number',
      required: true,
      placeholder: '20',
      helpText: 'Active cooking/baking time',
      validation: (value: string) => validateQuantity(value, { maxStock: 480 })
    },
    {
      name: 'shelfLife',
      label: 'Shelf Life (hours)',
      type: 'number',
      required: false,
      placeholder: '24',
      helpText: 'How long the finished product stays fresh',
      validation: (value: string) => {
        if (!value) return { isValid: true };
        return validateQuantity(value, { maxStock: 168 }); // Max 1 week
      }
    },
    {
      name: 'tags',
      label: 'Tags',
      type: 'text',
      required: false,
      placeholder: 'signature, popular, seasonal, vegetarian...',
      helpText: 'Comma-separated tags for easy searching and organization'
    },
    {
      name: 'notes',
      label: 'Chef Notes',
      type: 'textarea',
      required: false,
      placeholder: 'Special instructions, variations, tips for kitchen staff...',
      helpText: 'Internal notes for kitchen staff and management'
    }
  ];

  // Add recipe
  const addRecipe = async (values: Record<string, any>) => {
    const loadingId = showLoading('Creating Recipe', `Creating "${values.name}"...`);
    setIsProcessing(true);
    
    try {
      const recipeData = {
        name: values.name,
        description: values.description || '',
        category: values.category,
        type: values.type,
        difficulty: values.difficulty,
        yield: {
          quantity: parseInt(values.yieldQuantity),
          unit: values.yieldUnit,
          servings: values.servings ? parseInt(values.servings) : parseInt(values.yieldQuantity),
          description: `Makes ${values.yieldQuantity} ${values.yieldUnit}`
        },
        timing: {
          prepTime: parseInt(values.prepTime || '0'),
          cookTime: parseInt(values.cookTime || '0'),
          totalTime: parseInt(values.prepTime || '0') + parseInt(values.cookTime || '0'),
          shelfLife: values.shelfLife ? parseInt(values.shelfLife) : undefined
        },
        metadata: {
          tags: values.tags ? values.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
          notes: values.notes || ''
        },
        ingredients: [], // Will be added separately
        instructions: []
      };

      await apiPost('/api/recipes', recipeData);
      setShowAddForm(false);
      refetch();
      onRecipeUpdated?.();
      
      removeNotification(loadingId);
      showSuccess(
        'Recipe Created',
        `"${values.name}" has been created successfully. Add ingredients and instructions to complete the recipe.`,
        [{ label: 'Add Ingredients', action: () => {}, style: 'secondary' }]
      );
    } catch (error: any) {
      removeNotification(loadingId);
      showError(
        'Failed to Create Recipe',
        `Could not create "${values.name}". Please try again.`,
        [{ label: 'Try Again', action: () => addRecipe(values), style: 'primary' }]
      );
      console.error('Error creating recipe:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // Update recipe
  const updateRecipe = async (values: Record<string, any>) => {
    if (!editingRecipe) return;
    const loadingId = showLoading('Updating Recipe', `Updating "${values.name}"...`);
    setIsProcessing(true);
    
    try {
      const updates = {
        name: values.name,
        description: values.description || '',
        category: values.category,
        type: values.type,
        difficulty: values.difficulty,
        yield: {
          quantity: parseInt(values.yieldQuantity),
          unit: values.yieldUnit,
          servings: values.servings ? parseInt(values.servings) : parseInt(values.yieldQuantity),
          description: `Makes ${values.yieldQuantity} ${values.yieldUnit}`
        },
        timing: {
          prepTime: parseInt(values.prepTime || '0'),
          cookTime: parseInt(values.cookTime || '0'),
          totalTime: parseInt(values.prepTime || '0') + parseInt(values.cookTime || '0'),
          shelfLife: values.shelfLife ? parseInt(values.shelfLife) : undefined
        },
        metadata: {
          ...editingRecipe.metadata,
          tags: values.tags ? values.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
          notes: values.notes || ''
        }
      };

      await apiPatch(`/api/recipes/${editingRecipe.id}`, updates);
      setEditingRecipe(null);
      refetch();
      onRecipeUpdated?.();
      
      removeNotification(loadingId);
      showSuccess(
        'Recipe Updated',
        `"${values.name}" has been updated successfully.`
      );
    } catch (error: any) {
      removeNotification(loadingId);
      showError(
        'Failed to Update Recipe',
        `Could not update "${values.name}". Please try again.`
      );
      console.error('Error updating recipe:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete recipe
  const deleteRecipe = async (recipeId: string, recipeName: string) => {
    if (!confirm(`Are you sure you want to deactivate the recipe "${recipeName}"? This action can be undone.`)) return;
    
    const loadingId = showLoading('Deactivating Recipe', `Deactivating "${recipeName}"...`);
    try {
      await apiDelete(`/api/recipes/${recipeId}`);
      refetch();
      onRecipeUpdated?.();
      
      removeNotification(loadingId);
      showSuccess(
        'Recipe Deactivated',
        `"${recipeName}" has been deactivated and removed from active recipes.`
      );
    } catch (error: any) {
      removeNotification(loadingId);
      showError(
        'Failed to Deactivate Recipe',
        `Could not deactivate "${recipeName}". Please try again.`
      );
      console.error('Error deactivating recipe:', error);
    }
  };

  // Scale recipe
  const scaleRecipe = async () => {
    if (!scalingRecipe || !targetYield) return;
    
    const loadingId = showLoading('Scaling Recipe', `Scaling "${scalingRecipe.name}" to ${targetYield} ${scalingRecipe.yield.unit}...`);
    try {
      const response = await apiPost(`/api/recipes/${scalingRecipe.id}/scale`, { targetYield });
      setScaledRecipe(response);
      
      removeNotification(loadingId);
      showSuccess(
        'Recipe Scaled',
        `"${scalingRecipe.name}" has been scaled successfully.`
      );
    } catch (error: any) {
      removeNotification(loadingId);
      showError(
        'Failed to Scale Recipe',
        `Could not scale "${scalingRecipe.name}". Please try again.`
      );
      console.error('Error scaling recipe:', error);
    }
  };

  if (loading && !recipes) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Error loading recipes: {error}</p>
        <Button onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MdRestaurant className="text-orange-600" />
            Recipe Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Create and manage recipes with cost analysis and ingredient tracking</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <FaPlus /> Add Recipe
        </Button>
      </div>

      {/* Add/Edit Recipe Form */}
      {(showAddForm || editingRecipe) && (
        <Card>
          <CardContent className="p-6">
            <SmartForm
              fields={recipeFormFields}
              onSubmit={editingRecipe ? updateRecipe : addRecipe}
              onCancel={() => {
                setShowAddForm(false);
                setEditingRecipe(null);
              }}
              title={editingRecipe ? `Edit Recipe: ${editingRecipe.name}` : 'Create New Recipe'}
              description={editingRecipe ? 'Update the recipe details below' : 'Enter the basic recipe information. You can add ingredients and instructions after creation.'}
              submitLabel={editingRecipe ? 'Update Recipe' : 'Create Recipe'}
              cancelLabel="Cancel"
              autoSave={true}
              autoSaveKey={editingRecipe ? `edit-recipe-${editingRecipe.id}` : 'add-recipe'}
              disabled={isProcessing}
              initialValues={editingRecipe ? {
                name: editingRecipe.name,
                description: editingRecipe.description,
                category: editingRecipe.category,
                type: editingRecipe.type,
                difficulty: editingRecipe.difficulty,
                yieldQuantity: editingRecipe.yield.quantity.toString(),
                yieldUnit: editingRecipe.yield.unit,
                servings: editingRecipe.yield.servings?.toString() || '',
                prepTime: editingRecipe.timing.prepTime.toString(),
                cookTime: editingRecipe.timing.cookTime.toString(),
                shelfLife: editingRecipe.timing.shelfLife?.toString() || '',
                tags: editingRecipe.metadata.tags.join(', '),
                notes: editingRecipe.metadata.notes
              } : {
                difficulty: 'medium',
                type: 'finished_dish',
                yieldQuantity: '1',
                yieldUnit: 'serving',
                prepTime: '15',
                cookTime: '20'
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Recipe Scaling Modal */}
      {scalingRecipe && (
        <Card className="fixed inset-0 z-50 m-8 overflow-auto bg-white dark:bg-gray-800 border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaFlask className="text-blue-600" />
              Scale Recipe: {scalingRecipe.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original Recipe Info */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Original Recipe</h3>
                <div className="space-y-2">
                  <p><strong>Yield:</strong> {scalingRecipe.yield.quantity} {scalingRecipe.yield.unit}</p>
                  <p><strong>Servings:</strong> {scalingRecipe.yield.servings || scalingRecipe.yield.quantity}</p>
                  <p><strong>Prep Time:</strong> {scalingRecipe.timing.prepTime} minutes</p>
                  <p><strong>Cook Time:</strong> {scalingRecipe.timing.cookTime} minutes</p>
                  <p><strong>Total Cost:</strong> ${scalingRecipe.costing.totalIngredientCost.toFixed(2)}</p>
                </div>
              </div>

              {/* Scaling Controls */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Scale To</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Target Yield ({scalingRecipe.yield.unit})
                    </label>
                    <Input
                      type="number"
                      value={targetYield}
                      onChange={(e) => setTargetYield(parseFloat(e.target.value) || 1)}
                      min="0.1"
                      step="0.1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={scaleRecipe}>Calculate Scale</Button>
                    <Button variant="outline" onClick={() => setScalingRecipe(null)}>Cancel</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Scaled Recipe Results */}
            {scaledRecipe && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="text-lg font-semibold mb-4">Scaled Recipe Results</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>Scale Factor:</strong> {scaledRecipe.scaleFactor.toFixed(2)}x</p>
                    <p><strong>New Yield:</strong> {scaledRecipe.targetYield} {scalingRecipe.yield.unit}</p>
                    <p><strong>Estimated Prep Time:</strong> {scaledRecipe.scaledTiming?.prepTime} minutes</p>
                    <p><strong>Cook Time:</strong> {scaledRecipe.scaledTiming?.cookTime} minutes</p>
                  </div>
                  <div>
                    {scaledRecipe.warnings.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-orange-600 font-medium flex items-center gap-2">
                          <FaExclamationTriangle /> Warnings:
                        </p>
                        {scaledRecipe.warnings.map((warning, index) => (
                          <p key={index} className="text-sm text-orange-600">• {warning}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Scaled Ingredients */}
                <div className="mt-4">
                  <h5 className="font-semibold mb-2">Scaled Ingredients:</h5>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {scaledRecipe.scaledIngredients.map((ingredient, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{ingredient.scaledAmount.toFixed(2)} {ingredient.unit}</span>
                        <span className="text-gray-600 ml-2">(was {ingredient.originalAmount} {ingredient.unit})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
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
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Types</option>
              <option value="finished_dish">🍽️ Finished Dishes</option>
              <option value="component">🧩 Components</option>
              <option value="sauce">🍯 Sauces</option>
              <option value="prep_item">🔪 Prep Items</option>
              <option value="base">🏗️ Base Recipes</option>
            </select>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Difficulties</option>
              <option value="easy">⭐ Easy</option>
              <option value="medium">⭐⭐ Medium</option>
              <option value="hard">⭐⭐⭐ Hard</option>
              <option value="expert">⭐⭐⭐⭐ Expert</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Recipe Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe) => (
          <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold truncate">{recipe.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">
                      {recipeCategories?.[recipe.category as keyof typeof recipeCategories]?.icon || '🍽️'} {recipe.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {recipe.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className={`text-xs ${i < ['easy', 'medium', 'hard', 'expert'].indexOf(recipe.difficulty) + 1 ? 'text-yellow-400' : 'text-gray-300'}`}>
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recipe.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {recipe.description}
                </p>
              )}
              
              {/* Recipe Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <FaUsers className="text-blue-600" />
                  <span>{recipe.yield.servings || recipe.yield.quantity} servings</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaClock className="text-green-600" />
                  <span>{recipe.timing.totalTime}min</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaDollarSign className="text-orange-600" />
                  <span>${recipe.costing.costPerServing.toFixed(2)}/serving</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaUtensils className="text-purple-600" />
                  <span>{recipe.ingredients.length} ingredients</span>
                </div>
              </div>

              {/* Tags */}
              {recipe.metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {recipe.metadata.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                  {recipe.metadata.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{recipe.metadata.tags.length - 3} more</span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingRecipe(recipe)}
                  className="flex-1"
                >
                  <FaInfo className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingRecipe(recipe)}
                >
                  <FaEdit className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setScalingRecipe(recipe)}
                >
                  <FaFlask className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => deleteRecipe(recipe.id, recipe.name)}
                  className="text-red-600 hover:text-red-700"
                >
                  <FaTrash className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🍽️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No recipes found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || selectedCategory !== 'All' || selectedType !== 'All' 
              ? 'Try adjusting your search or filter criteria'
              : 'Add your first recipe to get started with cost management and inventory integration'
            }
          </p>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {viewingRecipe && (
        <Card className="fixed inset-0 z-50 m-8 overflow-auto bg-white dark:bg-gray-800 border shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {recipeCategories?.[viewingRecipe.category as keyof typeof recipeCategories]?.icon || '🍽️'}
                  {viewingRecipe.name}
                </CardTitle>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{viewingRecipe.description}</p>
              </div>
              <Button variant="outline" onClick={() => setViewingRecipe(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Recipe Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <FaUsers className="text-2xl text-blue-600 mx-auto mb-2" />
                <div className="text-lg font-semibold">{viewingRecipe.yield.servings || viewingRecipe.yield.quantity}</div>
                <div className="text-sm text-gray-600">Servings</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <FaClock className="text-2xl text-green-600 mx-auto mb-2" />
                <div className="text-lg font-semibold">{viewingRecipe.timing.totalTime}min</div>
                <div className="text-sm text-gray-600">Total Time</div>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <FaDollarSign className="text-2xl text-orange-600 mx-auto mb-2" />
                <div className="text-lg font-semibold">${viewingRecipe.costing.costPerServing.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Cost/Serving</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <FaUtensils className="text-2xl text-purple-600 mx-auto mb-2" />
                <div className="text-lg font-semibold">{viewingRecipe.ingredients.length}</div>
                <div className="text-sm text-gray-600">Ingredients</div>
              </div>
            </div>

            {/* Ingredients List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Ingredients</h3>
              <div className="space-y-2">
                {viewingRecipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <span className="font-medium">{ingredient.quantity.amount} {ingredient.quantity.unit}</span>
                      <span className="ml-2">{ingredient.name}</span>
                      {ingredient.preparation?.method && (
                        <span className="ml-2 text-sm text-gray-600">({ingredient.preparation.method})</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      ${ingredient.cost?.totalCost.toFixed(2) || '0.00'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            {viewingRecipe.instructions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Instructions</h3>
                <div className="space-y-3">
                  {viewingRecipe.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full flex items-center justify-center text-sm font-semibold">
                        {instruction.step}
                      </div>
                      <div className="flex-1">
                        {instruction.title && (
                          <h4 className="font-medium mb-1">{instruction.title}</h4>
                        )}
                        <p className="text-sm text-gray-700 dark:text-gray-300">{instruction.instruction}</p>
                        {instruction.duration && (
                          <p className="text-xs text-gray-500 mt-1">⏱️ {instruction.duration} minutes</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost Breakdown */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Cost Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Ingredient Cost:</span>
                    <span>${viewingRecipe.costing.totalIngredientCost.toFixed(2)}</span>
                  </div>
                  {viewingRecipe.costing.laborCostPerBatch && (
                    <div className="flex justify-between">
                      <span>Labor Cost:</span>
                      <span>${viewingRecipe.costing.laborCostPerBatch.toFixed(2)}</span>
                    </div>
                  )}
                  {viewingRecipe.costing.overheadCostPerBatch && (
                    <div className="flex justify-between">
                      <span>Overhead Cost:</span>
                      <span>${viewingRecipe.costing.overheadCostPerBatch.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total Cost:</span>
                    <span>${viewingRecipe.costing.totalCostPerBatch.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Cost per Serving:</span>
                    <span>${viewingRecipe.costing.costPerServing.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost per Unit:</span>
                    <span>${viewingRecipe.costing.costPerUnit.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Last calculated: {new Date(viewingRecipe.costing.lastCalculated).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Tags and Notes */}
            {(viewingRecipe.metadata.tags.length > 0 || viewingRecipe.metadata.notes) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {viewingRecipe.metadata.tags.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <FaTags className="text-blue-600" />
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {viewingRecipe.metadata.tags.map((tag) => (
                        <span key={tag} className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {viewingRecipe.metadata.notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Chef Notes</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                      {viewingRecipe.metadata.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RecipeManagement;
