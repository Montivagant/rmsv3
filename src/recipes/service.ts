/**
 * Recipe & BOM Service
 * 
 * Comprehensive recipe management service with cost calculation,
 * inventory integration, and production planning capabilities.
 */

import type { EventStore } from '../events/types';
import { generateEventId } from '../events/hash';
import { getRole } from '../rbac/roles';
import type {
  Recipe,
  RecipeQuery,
  RecipeValidation,
  RecipeScale,
  MenuItemRecipe,
  BatchProduction,
  RecipeAnalytics,
  CostCalculationOptions,
  RecipeCreatedEvent,
  RecipeUpdatedEvent,
  RecipeCostCalculatedEvent,
  BatchProductionStartedEvent,
  InventoryDeductedEvent,
  RecipeCategory,
  RecipeType
} from './types';

// Inventory integration
interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  uom: {
    base: string;
    purchase: string;
    recipe: string;
    conversions: Array<{
      fromUnit: string;
      toUnit: string;
      factor: number;
    }>;
  };
  costing: {
    averageCost: number;
    currency: string;
  };
  levels: {
    current: number;
    available: number;
  };
}

export class RecipeService {
  private recipes: Map<string, Recipe> = new Map();
  private menuItemRecipes: Map<string, MenuItemRecipe> = new Map();
  private batchProductions: Map<string, BatchProduction> = new Map();
  private inventoryItems: Map<string, InventoryItem> = new Map();

  private eventStore: EventStore;

  constructor(eventStore: EventStore) {
    this.eventStore = eventStore;
    this.rebuildState();
    // Note: EventStore interface doesn't have subscribe method
    // State rebuilding will be triggered manually when needed
  }

  // State Rebuilding
  private rebuildState() {
    this.recipes.clear();
    this.menuItemRecipes.clear();
    this.batchProductions.clear();

    const events = this.eventStore.getAll();
    const recipeEvents = events.filter(event => 
      event.type.startsWith('recipe.') ||
      event.type.startsWith('inventory.item.')
    );

    for (const event of recipeEvents) {
      this.applyEvent(event);
    }
  }

  private applyEvent(event: any) {
    switch (event.type) {
      case 'recipe.created': {
        const recipe = this.buildRecipeFromCreatedEvent(event);
        this.recipes.set(recipe.id, recipe);
        break;
      }
      case 'recipe.updated': {
        const payload = event.payload as RecipeUpdatedEvent['payload'];
        const existing = this.recipes.get(payload.recipeId);
        if (existing) {
          const updated = { ...existing, ...payload.changes };
          updated.metadata.updatedAt = event.timestamp;
          updated.metadata.version = payload.version;
          this.recipes.set(payload.recipeId, updated);
        }
        break;
      }
      case 'recipe.cost.calculated': {
        const payload = event.payload as RecipeCostCalculatedEvent['payload'];
        const existing = this.recipes.get(payload.recipeId);
        if (existing) {
          existing.costing = {
            ...existing.costing,
            totalIngredientCost: payload.totalIngredientCost,
            costPerServing: payload.costPerServing,
            costPerUnit: payload.costPerUnit,
            lastCalculated: event.timestamp
          };
          this.recipes.set(payload.recipeId, existing);
        }
        break;
      }
      case 'inventory.item.created':
      case 'inventory.item.updated': {
        // Cache inventory items for cost calculations
        const inventoryItem = this.buildInventoryItemFromEvent(event);
        if (inventoryItem) {
          this.inventoryItems.set(inventoryItem.id, inventoryItem);
        }
        break;
      }
    }
  }

  private buildRecipeFromCreatedEvent(event: any): Recipe {
    const payload = event.payload as RecipeCreatedEvent['payload'];
    return {
      id: payload.recipeId,
      name: payload.name,
      description: '',
      category: payload.category,
      type: payload.type,
      difficulty: 'medium',
      metadata: {
        createdAt: event.timestamp,
        updatedAt: event.timestamp,
        createdBy: payload.createdBy,
        version: 1,
        isActive: true,
        tags: [],
        notes: ''
      },
      yield: payload.yield,
      timing: {
        prepTime: 0,
        cookTime: 0,
        totalTime: 0
      },
      instructions: [],
      ingredients: payload.ingredients,
      equipment: [],
      costing: {
        totalIngredientCost: 0,
        costPerServing: 0,
        costPerUnit: 0,
        totalCostPerBatch: 0,
        currency: 'USD',
        lastCalculated: event.timestamp
      },
      quality: {},
      production: {
        batchSize: {
          min: 1,
          max: 10,
          optimal: 5,
          unit: payload.yield.unit
        },
        scalable: true,
        makeAhead: false,
        freezable: false
      }
    };
  }

  private buildInventoryItemFromEvent(event: any): InventoryItem | null {
    // Simplified inventory item extraction from events
    if (event.type === 'inventory.item.created') {
      return {
        id: event.payload.itemId,
        sku: event.payload.sku,
        name: event.payload.name,
        uom: event.payload.uom || {
          base: 'piece',
          purchase: 'piece',
          recipe: 'piece',
          conversions: []
        },
        costing: event.payload.costing || {
          averageCost: 0,
          currency: 'USD'
        },
        levels: event.payload.levels || {
          current: 0,
          available: 0
        }
      };
    }
    return null;
  }

  // Recipe CRUD Operations
  async createRecipe(recipeData: Partial<Recipe>): Promise<string> {
    const validation = this.validateRecipe(recipeData);
    if (!validation.isValid) {
      throw new Error(`Recipe validation failed: ${validation.errors.join(', ')}`);
    }

    const recipeId = generateEventId();
    const currentUser = getRole();

    // Ensure required fields
    const defaultRecipe: Omit<Recipe, 'id'> = {
      name: recipeData.name || '',
      description: recipeData.description || '',
      category: recipeData.category || 'main_course',
      type: recipeData.type || 'finished_dish',
      difficulty: recipeData.difficulty || 'medium',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser,
        version: 1,
        isActive: true,
        tags: recipeData.metadata?.tags || [],
        notes: recipeData.metadata?.notes || ''
      },
      yield: recipeData.yield || {
        quantity: 1,
        unit: 'serving',
        servings: 1
      },
      timing: recipeData.timing || {
        prepTime: 0,
        cookTime: 0,
        totalTime: 0
      },
      instructions: recipeData.instructions || [],
      ingredients: recipeData.ingredients || [],
      equipment: recipeData.equipment || [],
      ...(recipeData.nutrition && { nutrition: recipeData.nutrition }),
      costing: {
        totalIngredientCost: 0,
        costPerServing: 0,
        costPerUnit: 0,
        totalCostPerBatch: 0,
        currency: 'USD',
        lastCalculated: new Date().toISOString()
      },
      quality: recipeData.quality || {},
      production: {
        batchSize: {
          min: 1,
          max: 10,
          optimal: 5,
          unit: recipeData.yield?.unit || 'serving'
        },
        scalable: true,
        makeAhead: false,
        freezable: false,
        ...recipeData.production
      }
    };

    const event: RecipeCreatedEvent = {
      type: 'recipe.created',
      payload: {
        recipeId,
        name: defaultRecipe.name,
        category: defaultRecipe.category,
        type: defaultRecipe.type,
        yield: defaultRecipe.yield,
        ingredients: defaultRecipe.ingredients,
        createdBy: currentUser
      },
      timestamp: new Date().toISOString(),
      aggregateId: recipeId
    };

    await this.eventStore.append(event.type, event.payload, {
      key: `recipe-created-${recipeId}`,
      aggregate: { id: recipeId, type: 'recipe' }
    });

    // Calculate initial costs
    await this.calculateRecipeCost(recipeId);

    return recipeId;
  }

  async updateRecipe(recipeId: string, updates: Partial<Recipe>): Promise<void> {
    const existing = this.recipes.get(recipeId);
    if (!existing) {
      throw new Error(`Recipe ${recipeId} not found`);
    }

    if (!existing.metadata.isActive) {
      throw new Error('Cannot update inactive recipe');
    }

    const validation = this.validateRecipeUpdate(updates);
    if (!validation.isValid) {
      throw new Error(`Recipe validation failed: ${validation.errors.join(', ')}`);
    }

    const currentUser = getRole();
    const newVersion = existing.metadata.version + 1;

    const event: RecipeUpdatedEvent = {
      type: 'recipe.updated',
      payload: {
        recipeId,
        changes: {
          ...updates,
          metadata: {
            ...existing.metadata,
            ...updates.metadata,
            updatedAt: new Date().toISOString(),
            version: newVersion
          }
        },
        updatedBy: currentUser,
        version: newVersion
      },
      timestamp: new Date().toISOString(),
      aggregateId: recipeId
    };

    await this.eventStore.append(event.type, event.payload, {
      key: `recipe-updated-${recipeId}-${newVersion}`,
      aggregate: { id: recipeId, type: 'recipe' }
    });

    // Recalculate costs if ingredients changed
    if (updates.ingredients) {
      await this.calculateRecipeCost(recipeId);
    }
  }

  async getRecipeById(recipeId: string): Promise<Recipe | null> {
    return this.recipes.get(recipeId) || null;
  }

  async getAllRecipes(query: RecipeQuery = {}): Promise<Recipe[]> {
    let recipes = Array.from(this.recipes.values());

    // Apply filters
    if (query.category) {
      recipes = recipes.filter(recipe => recipe.category === query.category);
    }

    if (query.type) {
      recipes = recipes.filter(recipe => recipe.type === query.type);
    }

    if (query.difficulty) {
      recipes = recipes.filter(recipe => recipe.difficulty === query.difficulty);
    }

    if (query.isActive !== undefined) {
      recipes = recipes.filter(recipe => recipe.metadata.isActive === query.isActive);
    }

    if (query.hasIngredient) {
      recipes = recipes.filter(recipe => 
        recipe.ingredients.some(ing => ing.inventoryItemId === query.hasIngredient)
      );
    }

    if (query.maxPrepTime) {
      recipes = recipes.filter(recipe => recipe.timing.prepTime <= query.maxPrepTime!);
    }

    if (query.maxCost) {
      recipes = recipes.filter(recipe => recipe.costing.totalIngredientCost <= query.maxCost!);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      recipes = recipes.filter(recipe => 
        recipe.name.toLowerCase().includes(searchLower) ||
        recipe.description?.toLowerCase().includes(searchLower) ||
        recipe.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    if (query.tags && query.tags.length > 0) {
      recipes = recipes.filter(recipe =>
        query.tags!.some(tag => recipe.metadata.tags.includes(tag))
      );
    }

    // Apply sorting
    const sortBy = query.sortBy || 'name';
    const sortOrder = query.sortOrder || 'asc';

    recipes.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (sortBy) {
        case 'category':
          valueA = a.category;
          valueB = b.category;
          break;
        case 'cost':
          valueA = a.costing.totalIngredientCost;
          valueB = b.costing.totalIngredientCost;
          break;
        case 'prep_time':
          valueA = a.timing.prepTime;
          valueB = b.timing.prepTime;
          break;
        case 'created_date':
          valueA = new Date(a.metadata.createdAt).getTime();
          valueB = new Date(b.metadata.createdAt).getTime();
          break;
        default:
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply pagination
    if (query.limit || query.offset) {
      const offset = query.offset || 0;
      const limit = query.limit || recipes.length;
      recipes = recipes.slice(offset, offset + limit);
    }

    return recipes;
  }

  // Cost Calculation and BOM Analysis
  async calculateRecipeCost(
    recipeId: string, 
    options: CostCalculationOptions = { includeLabor: false, includeOverhead: false, useCurrentPrices: true }
  ): Promise<void> {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      throw new Error(`Recipe ${recipeId} not found`);
    }

    let totalIngredientCost = 0;
    const ingredientCosts: Array<{ inventoryItemId: string; cost: number }> = [];

    // Calculate cost for each ingredient
    for (const ingredient of recipe.ingredients) {
      const inventoryItem = this.inventoryItems.get(ingredient.inventoryItemId);
      if (!inventoryItem) {
        console.warn(`Inventory item ${ingredient.inventoryItemId} not found for recipe ${recipeId}`);
        continue;
      }

      // Convert recipe unit to inventory base unit if needed
      const costPerRecipeUnit = this.convertUnitCost(
        inventoryItem.costing.averageCost,
        inventoryItem.uom.base,
        ingredient.quantity.unit,
        inventoryItem.uom.conversions
      );

      const ingredientTotalCost = costPerRecipeUnit * ingredient.quantity.amount;
      totalIngredientCost += ingredientTotalCost;

      ingredientCosts.push({
        inventoryItemId: ingredient.inventoryItemId,
        cost: ingredientTotalCost
      });

      // Update ingredient cost
      ingredient.cost = {
        unitCost: costPerRecipeUnit,
        totalCost: ingredientTotalCost,
        currency: inventoryItem.costing.currency,
        lastUpdated: new Date().toISOString()
      };
    }

    // Scale costs if needed
    if (options.scaleTo && options.scaleTo !== recipe.yield.quantity) {
      const scaleFactor = options.scaleTo / recipe.yield.quantity;
      totalIngredientCost *= scaleFactor;
    }

    // Calculate per-serving and per-unit costs
    const servings = recipe.yield.servings || recipe.yield.quantity;
    const costPerServing = totalIngredientCost / servings;
    const costPerUnit = totalIngredientCost / recipe.yield.quantity;

    // Add labor and overhead if requested
    // Calculate total cost including labor and overhead
    // Note: Labor and overhead costs would be added here if needed for future calculations

    const currentUser = getRole();
    const event: RecipeCostCalculatedEvent = {
      type: 'recipe.cost.calculated',
      payload: {
        recipeId,
        totalIngredientCost,
        costPerServing,
        costPerUnit,
        calculatedBy: currentUser,
        ingredientCosts
      },
      timestamp: new Date().toISOString(),
      aggregateId: recipeId
    };

    await this.eventStore.append(event.type, event.payload, {
      key: `recipe-cost-calculated-${recipeId}-${event.timestamp}`,
      aggregate: { id: recipeId, type: 'recipe' }
    });
  }

  private convertUnitCost(
    baseCost: number,
    baseUnit: string,
    targetUnit: string,
    conversions: Array<{ fromUnit: string; toUnit: string; factor: number }>
  ): number {
    if (baseUnit === targetUnit) {
      return baseCost;
    }

    // Find conversion from base unit to target unit
    const conversion = conversions.find(c => 
      c.fromUnit === baseUnit && c.toUnit === targetUnit
    );

    if (conversion) {
      return baseCost / conversion.factor;
    }

    // Try reverse conversion
    const reverseConversion = conversions.find(c => 
      c.fromUnit === targetUnit && c.toUnit === baseUnit
    );

    if (reverseConversion) {
      return baseCost * reverseConversion.factor;
    }

    // If no conversion found, assume 1:1 ratio and warn
    console.warn(`No conversion found between ${baseUnit} and ${targetUnit}, assuming 1:1 ratio`);
    return baseCost;
  }

  // Recipe Scaling
  async scaleRecipe(recipeId: string, targetYield: number): Promise<RecipeScale> {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      throw new Error(`Recipe ${recipeId} not found`);
    }

    if (!recipe.production.scalable) {
      throw new Error(`Recipe ${recipe.name} is not scalable`);
    }

    const scaleFactor = targetYield / recipe.yield.quantity;
    
    const scaledIngredients = recipe.ingredients.map(ingredient => ({
      ingredientId: ingredient.id,
      originalAmount: ingredient.quantity.amount,
      scaledAmount: ingredient.quantity.amount * scaleFactor,
      unit: ingredient.quantity.unit
    }));

    const scaledTiming = {
      prepTime: Math.ceil(recipe.timing.prepTime * Math.sqrt(scaleFactor)), // Non-linear scaling
      cookTime: recipe.timing.cookTime, // Cooking time usually doesn't scale linearly
      totalTime: Math.ceil((recipe.timing.prepTime * Math.sqrt(scaleFactor)) + recipe.timing.cookTime)
    };

    const warnings: string[] = [];
    if (scaleFactor > 5) {
      warnings.push('Large scaling factors may affect cooking times and techniques');
    }
    if (scaleFactor < 0.25) {
      warnings.push('Very small batches may be difficult to execute properly');
    }

    return {
      originalYield: recipe.yield.quantity,
      targetYield,
      scaleFactor,
      scaledIngredients,
      scaledTiming,
      warnings,
      notes: [
        `Scaled by factor of ${scaleFactor.toFixed(2)}`,
        'Cooking times may need adjustment',
        'Taste and adjust seasonings after scaling'
      ]
    };
  }

  // Inventory Integration
  async deductInventoryForRecipe(
    recipeId: string,
    portionCount: number,
    orderId?: string,
    menuItemId?: string
  ): Promise<void> {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      throw new Error(`Recipe ${recipeId} not found`);
    }

    const deductions: Array<{
      inventoryItemId: string;
      amount: number;
      unit: string;
      cost: number;
    }> = [];

    let totalCost = 0;

    // Calculate deductions for each ingredient
    for (const ingredient of recipe.ingredients) {
      const inventoryItem = this.inventoryItems.get(ingredient.inventoryItemId);
      if (!inventoryItem) {
        throw new Error(`Inventory item ${ingredient.inventoryItemId} not found`);
      }

      // Calculate amount needed for the portion count
      const amountPerPortion = ingredient.quantity.amount / (recipe.yield.servings || recipe.yield.quantity);
      const totalAmountNeeded = amountPerPortion * portionCount;

      // Convert to inventory base unit for deduction
      const baseUnitAmount = this.convertQuantity(
        totalAmountNeeded,
        ingredient.quantity.unit,
        inventoryItem.uom.base,
        inventoryItem.uom.conversions
      );

      // Check availability
      if (inventoryItem.levels.available < baseUnitAmount) {
        throw new Error(`Insufficient inventory for ${inventoryItem.name}. Need ${baseUnitAmount} ${inventoryItem.uom.base}, have ${inventoryItem.levels.available}`);
      }

      const cost = inventoryItem.costing.averageCost * baseUnitAmount;
      totalCost += cost;

      deductions.push({
        inventoryItemId: ingredient.inventoryItemId,
        amount: baseUnitAmount,
        unit: inventoryItem.uom.base,
        cost
      });
    }

    const currentUser = getRole();
    const event: InventoryDeductedEvent = {
      type: 'recipe.inventory.deducted',
      payload: {
        recipeId,
        ...(menuItemId && { menuItemId }),
        ...(orderId && { orderId }),
        deductions,
        totalCost,
        performedBy: currentUser
      },
      timestamp: new Date().toISOString(),
      aggregateId: orderId || menuItemId || recipeId
    };

    await this.eventStore.append(event.type, event.payload, {
      key: `inventory-deducted-${recipeId}-${orderId || menuItemId || 'manual'}`,
      aggregate: { id: orderId || menuItemId || recipeId, type: 'order' }
    });

    // TODO: Actually deduct from inventory levels
    // This would require integration with the inventory service
  }

  private convertQuantity(
    amount: number,
    fromUnit: string,
    toUnit: string,
    conversions: Array<{ fromUnit: string; toUnit: string; factor: number }>
  ): number {
    if (fromUnit === toUnit) {
      return amount;
    }

    const conversion = conversions.find(c => 
      c.fromUnit === fromUnit && c.toUnit === toUnit
    );

    if (conversion) {
      return amount * conversion.factor;
    }

    const reverseConversion = conversions.find(c => 
      c.fromUnit === toUnit && c.toUnit === fromUnit
    );

    if (reverseConversion) {
      return amount / reverseConversion.factor;
    }

    console.warn(`No conversion found between ${fromUnit} and ${toUnit}, assuming 1:1 ratio`);
    return amount;
  }

  // Batch Production Management
  async startBatchProduction(
    recipeId: string,
    batchSize: number,
    assignedTo: string[]
  ): Promise<string> {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      throw new Error(`Recipe ${recipeId} not found`);
    }

    const batchId = generateEventId();

    const event: BatchProductionStartedEvent = {
      type: 'recipe.batch.started',
      payload: {
        batchId,
        recipeId,
        batchSize: {
          planned: batchSize,
          actual: batchSize,
          unit: recipe.yield.unit
        },
        assignedTo,
        startTime: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      aggregateId: batchId
    };

    await this.eventStore.append(event.type, event.payload, {
      key: `batch-production-started-${batchId}`,
      aggregate: { id: batchId, type: 'batch-production' }
    });

    return batchId;
  }

  // Validation Methods
  private validateRecipe(recipeData: Partial<Recipe>): RecipeValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const missingIngredients: string[] = [];
    const costIssues: string[] = [];

    if (!recipeData.name || recipeData.name.trim().length === 0) {
      errors.push('Recipe name is required');
    }

    if (!recipeData.category) {
      errors.push('Recipe category is required');
    }

    if (!recipeData.type) {
      errors.push('Recipe type is required');
    }

    if (!recipeData.yield || !recipeData.yield.quantity || recipeData.yield.quantity <= 0) {
      errors.push('Recipe yield quantity must be greater than 0');
    }

    if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
      errors.push('Recipe must have at least one ingredient');
    } else {
      // Validate ingredients
      for (const ingredient of recipeData.ingredients) {
        if (!ingredient.inventoryItemId) {
          missingIngredients.push(ingredient.name || 'Unknown ingredient');
        }

        if (ingredient.quantity.amount <= 0) {
          errors.push(`Ingredient ${ingredient.name} must have quantity greater than 0`);
        }

        if (!ingredient.quantity.unit) {
          errors.push(`Ingredient ${ingredient.name} must have a unit specified`);
        }
      }
    }

    if (recipeData.timing) {
      if (recipeData.timing.prepTime < 0 || recipeData.timing.cookTime < 0) {
        errors.push('Prep time and cook time cannot be negative');
      }

      if (recipeData.timing.totalTime !== (recipeData.timing.prepTime + recipeData.timing.cookTime)) {
        warnings.push('Total time should equal prep time plus cook time');
      }
    }

    // Cost validation
    if (recipeData.ingredients) {
      const ingredientsWithoutCost = recipeData.ingredients.filter(ing => 
        !ing.cost || ing.cost.totalCost === 0
      );
      if (ingredientsWithoutCost.length > 0) {
        costIssues.push(`${ingredientsWithoutCost.length} ingredients missing cost information`);
      }
    }

    // Suggestions
    if (!recipeData.instructions || recipeData.instructions.length === 0) {
      suggestions.push('Add cooking instructions to help kitchen staff');
    }

    if (!recipeData.equipment || recipeData.equipment.length === 0) {
      suggestions.push('List required equipment for better prep planning');
    }

    if (!recipeData.metadata?.tags || recipeData.metadata.tags.length === 0) {
      suggestions.push('Add tags to make the recipe easier to find');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      missingIngredients,
      costIssues
    };
  }

  private validateRecipeUpdate(updates: Partial<Recipe>): RecipeValidation {
    // Similar validation logic for updates
    return this.validateRecipe(updates);
  }

  // Analytics and Reporting
  async getRecipeAnalytics(recipeId: string): Promise<RecipeAnalytics | null> {
    const recipe = this.recipes.get(recipeId);
    if (!recipe) {
      return null;
    }

    // TODO: Implement analytics based on order history, production data, etc.
    // For now, return basic analytics structure
    return {
      recipeId,
      recipeName: recipe.name,
      popularity: {
        timesOrdered: 0,
        averageOrdersPerDay: 0,
        peakOrderTimes: [],
        seasonalTrends: []
      },
      costPerformance: {
        averageIngredientCost: recipe.costing.totalIngredientCost,
        costTrend: [],
        costVariance: 0,
        profitabilityScore: 0
      },
      production: {
        averagePrepTime: recipe.timing.prepTime,
        prepTimeVariance: 0,
        yieldConsistency: 100,
        qualityScoreAverage: 0,
        wastePercentage: 0
      },
      feedback: {
        averageRating: 0,
        totalReviews: 0,
        commonComplaints: [],
        commonPraises: []
      }
    };
  }

  // Utility Methods
  async getRecipesByCategory(category: RecipeCategory): Promise<Recipe[]> {
    return this.getAllRecipes({ category });
  }

  async getRecipesByType(type: RecipeType): Promise<Recipe[]> {
    return this.getAllRecipes({ type });
  }

  async searchRecipes(searchTerm: string): Promise<Recipe[]> {
    return this.getAllRecipes({ search: searchTerm });
  }

  async getRecipesWithIngredient(inventoryItemId: string): Promise<Recipe[]> {
    return this.getAllRecipes({ hasIngredient: inventoryItemId });
  }

  // Cost Analysis Methods
  async calculateMenuItemCost(menuItemId: string): Promise<number> {
    const menuItemRecipe = this.menuItemRecipes.get(menuItemId);
    if (!menuItemRecipe) {
      return 0;
    }

    const recipe = this.recipes.get(menuItemRecipe.recipeId);
    if (!recipe) {
      return 0;
    }

    // Calculate cost based on portion size
    const portionRatio = menuItemRecipe.portionSize.amount / recipe.yield.quantity;
    let totalCost = recipe.costing.totalIngredientCost * portionRatio;

    // Add garnish costs
    if (menuItemRecipe.garnishes) {
      totalCost += menuItemRecipe.garnishes.reduce((sum, garnish) => sum + garnish.cost, 0);
    }

    // Add side costs
    if (menuItemRecipe.sides) {
      for (const side of menuItemRecipe.sides) {
        const sideRecipe = this.recipes.get(side.recipeId);
        if (sideRecipe) {
          const sidePortionRatio = side.portionSize.amount / sideRecipe.yield.quantity;
          totalCost += sideRecipe.costing.totalIngredientCost * sidePortionRatio;
        }
      }
    }

    return totalCost;
  }

  async calculateSuggestedMenuPrice(menuItemId: string, targetMargin: number): Promise<number> {
    const cost = await this.calculateMenuItemCost(menuItemId);
    return cost / (1 - targetMargin / 100);
  }
}

// Create singleton instance
let recipeService: RecipeService | null = null;

export function createRecipeService(eventStore: EventStore): RecipeService {
  if (!recipeService) {
    recipeService = new RecipeService(eventStore);
  }
  return recipeService;
}

export function getRecipeService(): RecipeService {
  if (!recipeService) {
    throw new Error('Recipe service not initialized. Call createRecipeService first.');
  }
  return recipeService;
}
