/**
 * Recipe Management Component
 * 
 * Comprehensive UI for managing recipes, ingredients, cost analysis,
 * and integration with inventory and menu systems.
 */

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { SmartForm } from './forms/SmartForm';
import type { FormField } from './forms/SmartForm';
import { SkeletonCard } from './feedback/LoadingSpinner';
import { useNotifications } from './feedback/NotificationSystem';
import { useApi, apiPost, apiPatch, apiDelete } from '../hooks/useApi';
import { validateName, validateQuantity } from '../utils/validation';
import type {
  Recipe,
  RecipeScale
} from '../recipes/types';
import { RECIPE_CATEGORIES } from '../recipes/types';
import { RECIPE_TEXT } from '../constants/ui-text';
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
    options.push(...Object.entries(RECIPE_CATEGORIES).map(([key, cat]) => ({
      value: key,
      label: `${cat.icon} ${cat.name}`
    })));
    return options;
  }, []);

  // Get inventory options for ingredients
  const inventoryOptions = useMemo(() => {
    if (!inventoryItems || !Array.isArray(inventoryItems)) return [];
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
      label: RECIPE_TEXT.RECIPE_NAME,
      type: 'text',
      required: true,
      placeholder: 'Classic Cheeseburger, House Marinara...',
      helpText: RECIPE_TEXT.RECIPE_NAME_HELP,
      validation: validateName
    },
    {
      name: 'description',
      label: RECIPE_TEXT.DESCRIPTION,
      type: 'textarea',
      required: false,
      placeholder: 'Brief description of the dish, its characteristics, and appeal...',
      helpText: RECIPE_TEXT.DESCRIPTION_HELP
    },
    {
      name: 'category',
      label: RECIPE_TEXT.CATEGORY,
      type: 'select',
      required: true,
      options: categoryOptions.filter(opt => opt.value !== 'All'),
      helpText: RECIPE_TEXT.CATEGORY_HELP
    },
    {
      name: 'type',
      label: RECIPE_TEXT.RECIPE_TYPE,
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
      helpText: RECIPE_TEXT.TYPE_HELP
    },
    {
      name: 'difficulty',
      label: RECIPE_TEXT.DIFFICULTY_LEVEL,
      type: 'select',
      required: true,
      options: [
        { value: 'easy', label: '⭐ Easy - Basic skills required' },
        { value: 'medium', label: '⭐⭐ Medium - Intermediate skills' },
        { value: 'hard', label: '⭐⭐⭐ Hard - Advanced skills' },
        { value: 'expert', label: '⭐⭐⭐⭐ Expert - Specialized techniques' }
      ],
      helpText: RECIPE_TEXT.DIFFICULTY_HELP
    },
    {
      name: 'yieldQuantity',
      label: RECIPE_TEXT.YIELD_QUANTITY,
      type: 'number',
      required: true,
      placeholder: '1',
      helpText: RECIPE_TEXT.YIELD_QUANTITY_HELP,
      validation: (value: string) => validateQuantity(value, { maxStock: 1000 })
    },
    {
      name: 'yieldUnit',
      label: RECIPE_TEXT.YIELD_UNIT,
      type: 'text',
      required: true,
      placeholder: 'serving, cup, lb, piece...',
      helpText: RECIPE_TEXT.YIELD_UNIT_HELP
    },
    {
      name: 'servings',
      label: RECIPE_TEXT.NUMBER_OF_SERVINGS,
      type: 'number',
      required: false,
      placeholder: '1',
      helpText: RECIPE_TEXT.SERVINGS_HELP,
      validation: (value: string) => {
        if (!value) return { isValid: true };
        return validateQuantity(value, { maxStock: 100 });
      }
    },
    {
      name: 'prepTime',
      label: RECIPE_TEXT.PREP_TIME_MINUTES,
      type: 'number',
      required: true,
      placeholder: '15',
      helpText: RECIPE_TEXT.PREP_TIME_HELP,
      validation: (value: string) => validateQuantity(value, { maxStock: 480 })
    },
    {
      name: 'cookTime',
      label: RECIPE_TEXT.COOK_TIME_MINUTES,
      type: 'number',
      required: true,
      placeholder: '20',
      helpText: RECIPE_TEXT.COOK_TIME_HELP,
      validation: (value: string) => validateQuantity(value, { maxStock: 480 })
    },
    {
      name: 'shelfLife',
      label: RECIPE_TEXT.SHELF_LIFE_HOURS,
      type: 'number',
      required: false,
      placeholder: '24',
      helpText: RECIPE_TEXT.SHELF_LIFE_HELP,
      validation: (value: string) => {
        if (!value) return { isValid: true };
        return validateQuantity(value, { maxStock: 168 }); // Max 1 week
      }
    },
    {
      name: 'tags',
      label: RECIPE_TEXT.TAGS,
      type: 'text',
      required: false,
      placeholder: 'signature, popular, seasonal, vegetarian...',
      helpText: RECIPE_TEXT.TAGS_HELP
    },
    {
      name: 'notes',
      label: RECIPE_TEXT.CHEF_NOTES,
      type: 'textarea',
      required: false,
      placeholder: 'Special instructions, variations, tips for kitchen staff...',
      helpText: RECIPE_TEXT.NOTES_HELP
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
            <div className="h-8 bg-surface-secondary rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-surface-secondary rounded w-96 animate-pulse"></div>
          </div>
          <div className="h-10 bg-surface-secondary rounded w-32 animate-pulse"></div>
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
        <p className="text-destructive">Error loading recipes: {error}</p>
        <Button onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MdRestaurant className="text-orange-600" />
            {RECIPE_TEXT.RECIPE_MANAGEMENT}
          </h1>
          <p className="text-muted-foreground">{RECIPE_TEXT.CREATE_MANAGE_DESC}</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <FaPlus /> {RECIPE_TEXT.ADD_RECIPE}
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
              title={editingRecipe ? `${RECIPE_TEXT.EDIT_RECIPE}: ${editingRecipe.name}` : RECIPE_TEXT.CREATE_NEW_RECIPE}
              description={editingRecipe ? RECIPE_TEXT.UPDATE_RECIPE_DESC : RECIPE_TEXT.CREATE_RECIPE_DESC}
              submitLabel={editingRecipe ? RECIPE_TEXT.UPDATE_RECIPE : RECIPE_TEXT.CREATE_RECIPE}
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
        <Card className="fixed inset-0 z-50 m-8 overflow-auto bg-card border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FaFlask className="text-primary" />
              {RECIPE_TEXT.SCALE_RECIPE}: {scalingRecipe.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original Recipe Info */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{RECIPE_TEXT.ORIGINAL_RECIPE}</h3>
                <div className="space-y-2">
                  <p><strong>{RECIPE_TEXT.YIELD}</strong> {scalingRecipe.yield.quantity} {scalingRecipe.yield.unit}</p>
                  <p><strong>{RECIPE_TEXT.SERVINGS}</strong> {scalingRecipe.yield.servings || scalingRecipe.yield.quantity}</p>
                  <p><strong>{RECIPE_TEXT.PREP_TIME}</strong> {scalingRecipe.timing.prepTime} minutes</p>
                  <p><strong>{RECIPE_TEXT.COOK_TIME}</strong> {scalingRecipe.timing.cookTime} minutes</p>
                  <p><strong>{RECIPE_TEXT.TOTAL_COST}</strong> ${scalingRecipe.costing.totalIngredientCost.toFixed(2)}</p>
                </div>
              </div>

              {/* Scaling Controls */}
              <div>
                <h3 className="text-lg font-semibold mb-4">{RECIPE_TEXT.SCALE_TO}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {RECIPE_TEXT.TARGET_YIELD} ({scalingRecipe.yield.unit})
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
                    <Button onClick={scaleRecipe}>{RECIPE_TEXT.CALCULATE_SCALE}</Button>
                    <Button variant="outline" onClick={() => setScalingRecipe(null)}>Cancel</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Scaled Recipe Results */}
            {scaledRecipe && (
              <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <h4 className="text-lg font-semibold mb-4">{RECIPE_TEXT.SCALED_RESULTS}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p><strong>{RECIPE_TEXT.SCALE_FACTOR}</strong> {scaledRecipe.scaleFactor.toFixed(2)}x</p>
                    <p><strong>{RECIPE_TEXT.NEW_YIELD}</strong> {scaledRecipe.targetYield} {scalingRecipe.yield.unit}</p>
                    <p><strong>{RECIPE_TEXT.ESTIMATED_PREP}</strong> {scaledRecipe.scaledTiming?.prepTime} minutes</p>
                    <p><strong>{RECIPE_TEXT.COOK_TIME}</strong> {scaledRecipe.scaledTiming?.cookTime} minutes</p>
                  </div>
                  <div>
                    {scaledRecipe.warnings.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-warning font-medium flex items-center gap-2">
                          <FaExclamationTriangle /> {RECIPE_TEXT.WARNINGS}
                        </p>
                        {scaledRecipe.warnings.map((warning, index) => (
                          <p key={index} className="text-sm text-warning">• {warning}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Scaled Ingredients */}
                <div className="mt-4">
                  <h5 className="font-semibold mb-2">{RECIPE_TEXT.SCALED_INGREDIENTS}</h5>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {scaledRecipe.scaledIngredients.map((ingredient, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{ingredient.scaledAmount.toFixed(2)} {ingredient.unit}</span>
                        <span className="text-muted-foreground ml-2">(was {ingredient.originalAmount} {ingredient.unit})</span>
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
              placeholder={RECIPE_TEXT.SEARCH_RECIPES}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-surface text-foreground"
            >
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-surface text-foreground"
            >
              <option value="All">{RECIPE_TEXT.ALL_TYPES}</option>
              <option value="finished_dish">🍽️ Finished Dishes</option>
              <option value="component">🧩 Components</option>
              <option value="sauce">🍯 Sauces</option>
              <option value="prep_item">🔪 Prep Items</option>
              <option value="base">🏗️ Base Recipes</option>
            </select>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-surface text-foreground"
            >
              <option value="All">{RECIPE_TEXT.ALL_DIFFICULTIES}</option>
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
                    <span className="text-sm text-muted-foreground">
                      {RECIPE_CATEGORIES[recipe.category as keyof typeof RECIPE_CATEGORIES]?.icon || '🍽️'} {recipe.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs bg-surface-secondary text-muted-foreground px-2 py-1 rounded">
                      {recipe.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span key={i} className={`text-xs ${i < ['easy', 'medium', 'hard', 'expert'].indexOf(recipe.difficulty) + 1 ? 'text-warning' : 'text-muted'}`}>
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recipe.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {recipe.description}
                </p>
              )}
              
              {/* Recipe Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <FaUsers className="text-primary" />
                  <span>{recipe.yield.servings || recipe.yield.quantity} servings</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaClock className="text-success" />
                  <span>{recipe.timing.totalTime}min</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaDollarSign className="text-warning" />
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
                    <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                  {recipe.metadata.tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">+{recipe.metadata.tags.length - 3} more</span>
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
                  className="text-error hover:text-error"
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
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {RECIPE_TEXT.NO_RECIPES_FOUND}
          </h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedCategory !== 'All' || selectedType !== 'All' 
              ? RECIPE_TEXT.ADJUST_FILTERS_DESC
              : RECIPE_TEXT.NO_RECIPES_DESC
            }
          </p>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {viewingRecipe && (
        <Card className="fixed inset-0 z-50 m-8 overflow-auto bg-card border shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {RECIPE_CATEGORIES[viewingRecipe.category as keyof typeof RECIPE_CATEGORIES]?.icon || '🍽️'}
                  {viewingRecipe.name}
                </CardTitle>
                <p className="text-muted-foreground mt-1">{viewingRecipe.description}</p>
              </div>
              <Button variant="outline" onClick={() => setViewingRecipe(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Recipe Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <FaUsers className="text-2xl text-primary mx-auto mb-2" />
                <div className="text-lg font-semibold">{viewingRecipe.yield.servings || viewingRecipe.yield.quantity}</div>
                <div className="text-sm text-muted-foreground">{RECIPE_TEXT.SERVINGS}</div>
              </div>
              <div className="text-center p-4 bg-success/10 border border-success/20 rounded-lg">
                <FaClock className="text-2xl text-success mx-auto mb-2" />
                <div className="text-lg font-semibold">{viewingRecipe.timing.totalTime}min</div>
                <div className="text-sm text-muted-foreground">{RECIPE_TEXT.TOTAL_TIME}</div>
              </div>
              <div className="text-center p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <FaDollarSign className="text-2xl text-warning mx-auto mb-2" />
                <div className="text-lg font-semibold">${viewingRecipe.costing.costPerServing.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">{RECIPE_TEXT.COST_SERVING}</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <FaUtensils className="text-2xl text-purple-600 mx-auto mb-2" />
                <div className="text-lg font-semibold">{viewingRecipe.ingredients.length}</div>
                <div className="text-sm text-muted-foreground">{RECIPE_TEXT.INGREDIENTS}</div>
              </div>
            </div>

            {/* Ingredients List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{RECIPE_TEXT.INGREDIENTS}</h3>
              <div className="space-y-2">
                {viewingRecipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-surface-secondary border border-border rounded-lg">
                    <div>
                      <span className="font-medium">{ingredient.quantity.amount} {ingredient.quantity.unit}</span>
                      <span className="ml-2">{ingredient.name}</span>
                      {ingredient.preparation?.method && (
                        <span className="ml-2 text-sm text-muted-foreground">({ingredient.preparation.method})</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${ingredient.cost?.totalCost.toFixed(2) || '0.00'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            {viewingRecipe.instructions.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">{RECIPE_TEXT.INSTRUCTIONS}</h3>
                <div className="space-y-3">
                  {viewingRecipe.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-4 p-3 bg-surface-secondary border border-border rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">
                        {instruction.step}
                      </div>
                      <div className="flex-1">
                        {instruction.title && (
                          <h4 className="font-medium mb-1">{instruction.title}</h4>
                        )}
                        <p className="text-sm text-foreground">{instruction.instruction}</p>
                        {instruction.duration && (
                          <p className="text-xs text-muted-foreground mt-1">⏱️ {instruction.duration} minutes</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost Breakdown */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{RECIPE_TEXT.COST_ANALYSIS}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>{RECIPE_TEXT.INGREDIENT_COST}</span>
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
                    <span>{RECIPE_TEXT.COST_PER_SERVING}</span>
                    <span>${viewingRecipe.costing.costPerServing.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{RECIPE_TEXT.COST_PER_UNIT}</span>
                    <span>${viewingRecipe.costing.costPerUnit.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {RECIPE_TEXT.LAST_CALCULATED} {new Date(viewingRecipe.costing.lastCalculated).toLocaleDateString()}
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
                      <FaTags className="text-primary" />
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {viewingRecipe.metadata.tags.map((tag) => (
                        <span key={tag} className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {viewingRecipe.metadata.notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Chef Notes</h4>
                    <p className="text-sm text-foreground bg-warning/10 border border-warning/20 p-3 rounded-lg">
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
