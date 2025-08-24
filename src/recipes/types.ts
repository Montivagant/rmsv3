/**
 * Recipe & BOM (Bill of Materials) System Types
 * 
 * Comprehensive recipe management with ingredient tracking, cost analysis,
 * yield management, and integration with inventory and menu systems.
 */

// Core Recipe Types
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  category: RecipeCategory;
  type: RecipeType;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  
  // Recipe Metadata
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    version: number;
    isActive: boolean;
    tags: string[];
    notes?: string;
  };
  
  // Yield Information
  yield: {
    quantity: number;
    unit: string;
    servings?: number;
    portionSize?: {
      amount: number;
      unit: string;
    };
    description?: string; // e.g., "Makes 12 burgers" or "Yields 2 liters of sauce"
  };
  
  // Timing Information
  timing: {
    prepTime: number; // minutes
    cookTime: number; // minutes
    totalTime: number; // minutes
    restTime?: number; // minutes (for resting/cooling)
    shelfLife?: number; // hours (how long the prepared item lasts)
  };
  
  // Recipe Instructions
  instructions: RecipeInstruction[];
  
  // Ingredient List (BOM)
  ingredients: RecipeIngredient[];
  
  // Equipment and Tools
  equipment?: string[];
  
  // Nutritional Information (optional)
  nutrition?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
    allergens: string[];
  };
  
  // Cost Analysis
  costing: {
    totalIngredientCost: number;
    costPerServing: number;
    costPerUnit: number;
    laborCostPerBatch?: number;
    overheadCostPerBatch?: number;
    totalCostPerBatch: number;
    currency: string;
    lastCalculated: string;
  };
  
  // Quality and Standards
  quality: {
    targetTemperature?: {
      internal?: number;
      serving?: number;
      unit: 'celsius' | 'fahrenheit';
    };
    criticalControlPoints?: string[];
    haccp?: {
      hazards: string[];
      controls: string[];
      monitoring: string[];
    };
  };
  
  // Production Information
  production: {
    batchSize: {
      min: number;
      max: number;
      optimal: number;
      unit: string;
    };
    scalable: boolean;
    makeAhead: boolean;
    freezable: boolean;
    requirements?: string[]; // Special equipment, skills, etc.
  };
}

// Recipe Ingredient (BOM Component)
export interface RecipeIngredient {
  id: string;
  inventoryItemId: string; // Link to inventory system
  name: string; // Display name (may differ from inventory name)
  
  // Quantity Information
  quantity: {
    amount: number;
    unit: string; // Recipe unit (may need conversion from inventory unit)
    isOptional: boolean;
    notes?: string; // e.g., "or to taste", "divided"
  };
  
  // Preparation Instructions
  preparation?: {
    method?: string; // e.g., "diced", "sliced", "minced"
    size?: string; // e.g., "1/4 inch", "fine", "coarse"
    temperature?: string; // e.g., "room temperature", "cold"
    notes?: string;
  };
  
  // Cost Information
  cost: {
    unitCost: number; // Cost per recipe unit
    totalCost: number; // Total cost for this ingredient in recipe
    currency: string;
    lastUpdated: string;
  };
  
  // Substitutions
  substitutions?: RecipeSubstitution[];
  
  // Critical Information
  isCritical: boolean; // Cannot be substituted or omitted
  allergenInfo?: string[];
  
  // Ordering/Grouping
  order: number;
  group?: string; // e.g., "Marinade", "Sauce", "Garnish"
}

// Recipe Substitutions
export interface RecipeSubstitution {
  id: string;
  inventoryItemId: string;
  name: string;
  conversionRatio: number; // How much of substitute to use (1.0 = 1:1)
  notes?: string;
  qualityImpact?: 'none' | 'minimal' | 'moderate' | 'significant';
}

// Recipe Instructions
export interface RecipeInstruction {
  id: string;
  step: number;
  title?: string;
  instruction: string;
  duration?: number; // minutes
  temperature?: {
    value: number;
    unit: 'celsius' | 'fahrenheit';
  };
  equipment?: string[];
  tips?: string[];
  criticalControlPoint?: boolean;
  images?: string[];
}

// Recipe Categories
export type RecipeCategory = 
  | 'appetizer'
  | 'soup'
  | 'salad'
  | 'main_course'
  | 'side_dish'
  | 'dessert'
  | 'beverage'
  | 'sauce'
  | 'marinade'
  | 'dressing'
  | 'stock'
  | 'bread'
  | 'pasta'
  | 'prep_item'
  | 'component'
  | 'base';

// Recipe Types
export type RecipeType = 
  | 'finished_dish' // Complete menu item
  | 'component' // Part of other recipes (sauce, dressing, etc.)
  | 'prep_item' // Prep work (chopped vegetables, marinated proteins)
  | 'base' // Base recipes (stocks, sauces, doughs)
  | 'batch_prep' // Large batch items for efficiency
  | 'made_to_order' // Individual preparation
  | 'assembly'; // No cooking, just assembly

// Recipe Scaling
export interface RecipeScale {
  originalYield: number;
  targetYield: number;
  scaleFactor: number;
  scaledIngredients: Array<{
    ingredientId: string;
    originalAmount: number;
    scaledAmount: number;
    unit: string;
  }>;
  scaledTiming?: {
    prepTime: number;
    cookTime: number;
    totalTime: number;
  };
  notes?: string[];
  warnings?: string[];
}

// Menu Item Recipe Mapping
export interface MenuItemRecipe {
  menuItemId: string;
  recipeId: string;
  portionSize: {
    amount: number;
    unit: string;
  };
  garnishes?: Array<{
    inventoryItemId: string;
    amount: number;
    unit: string;
    cost: number;
  }>;
  sides?: Array<{
    recipeId: string;
    portionSize: {
      amount: number;
      unit: string;
    };
  }>;
  totalRecipeCost: number;
  profitMargin: number;
  suggestedPrice: number;
}

// Batch Production
export interface BatchProduction {
  id: string;
  recipeId: string;
  recipeName: string;
  
  // Production Details
  batchSize: {
    planned: number;
    actual: number;
    unit: string;
  };
  
  // Timing
  startTime: string;
  endTime?: string;
  plannedDuration: number; // minutes
  actualDuration?: number; // minutes
  
  // Staff and Equipment
  assignedTo: string[];
  equipmentUsed: string[];
  
  // Quality Control
  qualityChecks: Array<{
    checkpoint: string;
    result: 'pass' | 'fail' | 'conditional';
    notes?: string;
    checkedBy: string;
    timestamp: string;
  }>;
  
  // Cost Tracking
  actualCosts: {
    ingredients: number;
    labor: number;
    overhead: number;
    total: number;
  };
  
  // Yield Analysis
  yield: {
    expected: number;
    actual: number;
    variance: number; // percentage
    wasteAmount?: number;
    wasteReason?: string;
  };
  
  // Storage and Usage
  storage: {
    location: string;
    temperature?: number;
    expiryDate?: string;
    lotNumber?: string;
  };
  
  usage: Array<{
    timestamp: string;
    amount: number;
    unit: string;
    usedFor: string; // order ID, prep use, etc.
    remainingAmount: number;
  }>;
  
  status: 'planned' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  notes?: string[];
}

// Recipe Analytics
export interface RecipeAnalytics {
  recipeId: string;
  recipeName: string;
  
  // Popularity Metrics
  popularity: {
    timesOrdered: number;
    averageOrdersPerDay: number;
    peakOrderTimes: Array<{
      hour: number;
      orderCount: number;
    }>;
    seasonalTrends: Array<{
      month: number;
      orderCount: number;
    }>;
  };
  
  // Cost Performance
  costPerformance: {
    averageIngredientCost: number;
    costTrend: Array<{
      date: string;
      cost: number;
    }>;
    costVariance: number; // percentage
    profitabilityScore: number; // 0-100
  };
  
  // Production Efficiency
  production: {
    averagePrepTime: number;
    prepTimeVariance: number;
    yieldConsistency: number; // percentage
    qualityScoreAverage: number;
    wastePercentage: number;
  };
  
  // Customer Feedback
  feedback: {
    averageRating: number;
    totalReviews: number;
    commonComplaints: string[];
    commonPraises: string[];
  };
}

// Recipe Events (for event sourcing)
export interface RecipeCreatedEvent {
  type: 'recipe.created';
  payload: {
    recipeId: string;
    name: string;
    category: RecipeCategory;
    type: RecipeType;
    yield: Recipe['yield'];
    ingredients: RecipeIngredient[];
    createdBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface RecipeUpdatedEvent {
  type: 'recipe.updated';
  payload: {
    recipeId: string;
    changes: Partial<Recipe>;
    updatedBy: string;
    version: number;
  };
  timestamp: string;
  aggregateId: string;
}

export interface RecipeCostCalculatedEvent {
  type: 'recipe.cost.calculated';
  payload: {
    recipeId: string;
    totalIngredientCost: number;
    costPerServing: number;
    costPerUnit: number;
    calculatedBy: string;
    ingredientCosts: Array<{
      inventoryItemId: string;
      cost: number;
    }>;
  };
  timestamp: string;
  aggregateId: string;
}

export interface BatchProductionStartedEvent {
  type: 'recipe.batch.started';
  payload: {
    batchId: string;
    recipeId: string;
    batchSize: BatchProduction['batchSize'];
    assignedTo: string[];
    startTime: string;
  };
  timestamp: string;
  aggregateId: string;
}

export interface BatchProductionCompletedEvent {
  type: 'recipe.batch.completed';
  payload: {
    batchId: string;
    recipeId: string;
    actualYield: number;
    actualCost: number;
    qualityScore: number;
    completedBy: string[];
  };
  timestamp: string;
  aggregateId: string;
}

export interface InventoryDeductedEvent {
  type: 'recipe.inventory.deducted';
  payload: {
    recipeId: string;
    menuItemId?: string;
    orderId?: string;
    deductions: Array<{
      inventoryItemId: string;
      amount: number;
      unit: string;
      cost: number;
    }>;
    totalCost: number;
    performedBy: string;
  };
  timestamp: string;
  aggregateId: string;
}

// Query and Filter Types
export interface RecipeQuery {
  category?: RecipeCategory;
  type?: RecipeType;
  difficulty?: Recipe['difficulty'];
  isActive?: boolean;
  hasIngredient?: string; // inventory item ID
  maxPrepTime?: number;
  maxCost?: number;
  search?: string;
  tags?: string[];
  sortBy?: 'name' | 'category' | 'cost' | 'prep_time' | 'popularity' | 'created_date';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Recipe Validation
export interface RecipeValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  missingIngredients: string[];
  costIssues: string[];
}

// Cost Calculation Options
export interface CostCalculationOptions {
  includeLabor: boolean;
  includeOverhead: boolean;
  useCurrentPrices: boolean;
  scaleTo?: number; // scale recipe to this yield
  currency?: string;
}

// Recipe Import/Export
export interface RecipeImportData {
  recipes: Omit<Recipe, 'id' | 'metadata'>[];
  ingredientMappings: Array<{
    recipeName: string;
    inventoryItemSku: string;
    inventoryItemName: string;
  }>;
  validationResults: RecipeValidation[];
}

// Recipe Templates
export interface RecipeTemplate {
  id: string;
  name: string;
  description: string;
  category: RecipeCategory;
  type: RecipeType;
  templateIngredients: Array<{
    name: string;
    category: string;
    amount: number;
    unit: string;
    isOptional: boolean;
  }>;
  templateInstructions: Omit<RecipeInstruction, 'id'>[];
  estimatedTiming: Recipe['timing'];
}

// Common recipe templates for restaurants
export const RECIPE_TEMPLATES: RecipeTemplate[] = [
  {
    id: 'burger-template',
    name: 'Classic Burger',
    description: 'Template for creating burger recipes',
    category: 'main_course',
    type: 'finished_dish',
    templateIngredients: [
      { name: 'Ground Protein', category: 'protein', amount: 6, unit: 'oz', isOptional: false },
      { name: 'Burger Bun', category: 'bread', amount: 1, unit: 'piece', isOptional: false },
      { name: 'Cheese', category: 'dairy', amount: 1, unit: 'slice', isOptional: true },
      { name: 'Lettuce', category: 'vegetable', amount: 2, unit: 'leaves', isOptional: true },
      { name: 'Tomato', category: 'vegetable', amount: 2, unit: 'slices', isOptional: true },
      { name: 'Onion', category: 'vegetable', amount: 1, unit: 'slice', isOptional: true }
    ],
    templateInstructions: [
      { step: 1, instruction: 'Form protein into patty, season as desired', duration: 3 },
      { step: 2, instruction: 'Cook patty to desired doneness', duration: 8, temperature: { value: 375, unit: 'fahrenheit' } },
      { step: 3, instruction: 'Toast bun if desired', duration: 2 },
      { step: 4, instruction: 'Assemble burger with desired toppings', duration: 2 }
    ],
    estimatedTiming: {
      prepTime: 5,
      cookTime: 10,
      totalTime: 15
    }
  },
  {
    id: 'sauce-template',
    name: 'Basic Sauce',
    description: 'Template for creating sauce recipes',
    category: 'sauce',
    type: 'component',
    templateIngredients: [
      { name: 'Base Liquid', category: 'liquid', amount: 1, unit: 'cup', isOptional: false },
      { name: 'Thickening Agent', category: 'starch', amount: 2, unit: 'tbsp', isOptional: true },
      { name: 'Seasoning', category: 'spice', amount: 1, unit: 'tsp', isOptional: false },
      { name: 'Fat/Oil', category: 'fat', amount: 2, unit: 'tbsp', isOptional: true }
    ],
    templateInstructions: [
      { step: 1, instruction: 'Heat base liquid in saucepan', duration: 3 },
      { step: 2, instruction: 'Add seasonings and simmer', duration: 5 },
      { step: 3, instruction: 'Thicken if desired', duration: 3 },
      { step: 4, instruction: 'Strain and adjust seasoning', duration: 2 }
    ],
    estimatedTiming: {
      prepTime: 3,
      cookTime: 10,
      totalTime: 13
    }
  }
];

// Default recipe categories with icons and descriptions
export const RECIPE_CATEGORIES = {
  appetizer: { icon: '🥗', name: 'Appetizers', description: 'Starters and small plates' },
  soup: { icon: '🍲', name: 'Soups', description: 'Hot and cold soups' },
  salad: { icon: '🥙', name: 'Salads', description: 'Fresh salads and bowls' },
  main_course: { icon: '🍽️', name: 'Main Courses', description: 'Primary dishes and entrees' },
  side_dish: { icon: '🍠', name: 'Side Dishes', description: 'Accompaniments and sides' },
  dessert: { icon: '🍰', name: 'Desserts', description: 'Sweet treats and desserts' },
  beverage: { icon: '🥤', name: 'Beverages', description: 'Drinks and cocktails' },
  sauce: { icon: '🍯', name: 'Sauces', description: 'Sauces, dips, and condiments' },
  marinade: { icon: '🧂', name: 'Marinades', description: 'Marinades and brines' },
  dressing: { icon: '🫗', name: 'Dressings', description: 'Salad dressings and vinaigrettes' },
  stock: { icon: '🍲', name: 'Stocks & Broths', description: 'Base stocks and broths' },
  bread: { icon: '🍞', name: 'Breads', description: 'Breads, rolls, and baked goods' },
  pasta: { icon: '🍝', name: 'Pasta', description: 'Pasta dishes and noodles' },
  prep_item: { icon: '🔪', name: 'Prep Items', description: 'Prep work and components' },
  component: { icon: '🧩', name: 'Components', description: 'Recipe components and bases' },
  base: { icon: '🏗️', name: 'Base Recipes', description: 'Foundation recipes for other dishes' }
} as const;
