/**
 * Recipe & BOM API Handlers
 * 
 * MSW handlers for recipe management, cost calculation,
 * and BOM analysis with comprehensive mock data.
 */

import { http, HttpResponse } from 'msw';
import type { 
  Recipe,
  RecipeIngredient,
  RecipeScale,
  RecipeAnalytics,
  CostCalculationOptions,
  RecipeCategory,
  RecipeType
} from './types';
import { RECIPE_CATEGORIES, RECIPE_TEMPLATES } from './types';

// Mock data stores
const mockRecipes = new Map<string, Recipe>();
let nextRecipeId = 1;

// Initialize mock data
function initializeMockRecipes() {
  if (mockRecipes.size > 0) return; // Already initialized

  const sampleRecipes: Omit<Recipe, 'id'>[] = [
    {
      name: 'Classic Cheeseburger',
      description: 'Our signature beef burger with cheese, lettuce, tomato, and special sauce',
      category: 'main_course',
      type: 'finished_dish',
      difficulty: 'easy',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'chef-admin',
        version: 1,
        isActive: true,
        tags: ['burger', 'beef', 'cheese', 'signature'],
        notes: 'Customer favorite, high margin item'
      },
      yield: {
        quantity: 1,
        unit: 'serving',
        servings: 1,
        portionSize: { amount: 8, unit: 'oz' },
        description: 'Makes 1 burger'
      },
      timing: {
        prepTime: 5,
        cookTime: 8,
        totalTime: 13,
        shelfLife: 2
      },
      instructions: [
        {
          id: 'step-1',
          step: 1,
          title: 'Prep the patty',
          instruction: 'Form ground beef into 6oz patty, season with salt and pepper',
          duration: 2,
          equipment: ['scale', 'seasoning']
        },
        {
          id: 'step-2',
          step: 2,
          title: 'Cook the patty',
          instruction: 'Cook on grill for 4 minutes per side, add cheese in last minute',
          duration: 8,
          temperature: { value: 375, unit: 'fahrenheit' },
          equipment: ['grill', 'spatula']
        },
        {
          id: 'step-3',
          step: 3,
          title: 'Toast the bun',
          instruction: 'Lightly toast burger bun on grill',
          duration: 1,
          equipment: ['grill']
        },
        {
          id: 'step-4',
          step: 4,
          title: 'Assemble burger',
          instruction: 'Layer bottom bun, sauce, lettuce, tomato, patty with cheese, more sauce, top bun',
          duration: 2
        }
      ],
      ingredients: [
        {
          id: 'ing-1',
          inventoryItemId: 'item_1', // Ground beef from inventory
          name: 'Ground Beef 80/20',
          quantity: { amount: 6, unit: 'oz', isOptional: false },
          preparation: { method: 'formed into patty', notes: 'Season both sides' },
          cost: { unitCost: 0.83, totalCost: 4.98, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: true,
          order: 1,
          group: 'protein'
        },
        {
          id: 'ing-2',
          inventoryItemId: 'burger-bun-001',
          name: 'Sesame Burger Bun',
          quantity: { amount: 1, unit: 'piece', isOptional: false },
          cost: { unitCost: 0.75, totalCost: 0.75, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: true,
          order: 2,
          group: 'bread'
        },
        {
          id: 'ing-3',
          inventoryItemId: 'cheese-american-001',
          name: 'American Cheese Slice',
          quantity: { amount: 1, unit: 'slice', isOptional: false },
          cost: { unitCost: 0.35, totalCost: 0.35, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: false,
          order: 3,
          group: 'dairy'
        },
        {
          id: 'ing-4',
          inventoryItemId: 'item_2', // Roma tomatoes from inventory
          name: 'Roma Tomato',
          quantity: { amount: 2, unit: 'slices', isOptional: true },
          preparation: { method: 'sliced', size: '1/4 inch thick' },
          cost: { unitCost: 0.15, totalCost: 0.30, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: false,
          order: 4,
          group: 'vegetables'
        },
        {
          id: 'ing-5',
          inventoryItemId: 'lettuce-iceberg-001',
          name: 'Iceberg Lettuce',
          quantity: { amount: 2, unit: 'leaves', isOptional: true },
          preparation: { method: 'fresh leaves', notes: 'Crisp and cold' },
          cost: { unitCost: 0.10, totalCost: 0.20, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: false,
          order: 5,
          group: 'vegetables'
        },
        {
          id: 'ing-6',
          inventoryItemId: 'sauce-special-001',
          name: 'Special Burger Sauce',
          quantity: { amount: 1, unit: 'tbsp', isOptional: false },
          cost: { unitCost: 0.08, totalCost: 0.08, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: true,
          order: 6,
          group: 'sauce'
        }
      ],
      equipment: ['grill', 'spatula', 'tongs', 'scale'],
      nutrition: {
        calories: 650,
        protein: 35,
        carbs: 45,
        fat: 38,
        fiber: 3,
        sodium: 1200,
        allergens: ['gluten', 'dairy', 'soy']
      },
      costing: {
        totalIngredientCost: 6.66,
        costPerServing: 6.66,
        costPerUnit: 6.66,
        laborCostPerBatch: 2.50,
        overheadCostPerBatch: 1.25,
        totalCostPerBatch: 10.41,
        currency: 'USD',
        lastCalculated: new Date().toISOString()
      },
      quality: {
        targetTemperature: { internal: 160, serving: 140, unit: 'fahrenheit' },
        criticalControlPoints: ['Internal temperature', 'Hand washing', 'Time/temperature'],
        haccp: {
          hazards: ['Pathogenic bacteria', 'Cross contamination'],
          controls: ['Temperature monitoring', 'Hand washing', 'Clean surfaces'],
          monitoring: ['Thermometer checks', 'Time logs']
        }
      },
      production: {
        batchSize: { min: 1, max: 20, optimal: 10, unit: 'serving' },
        scalable: true,
        makeAhead: false,
        freezable: false,
        requirements: ['Grill must be preheated', 'Fresh ingredients only']
      }
    },
    {
      name: 'House Marinara Sauce',
      description: 'Traditional Italian marinara sauce made with San Marzano tomatoes',
      category: 'sauce',
      type: 'component',
      difficulty: 'medium',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'chef-admin',
        version: 1,
        isActive: true,
        tags: ['sauce', 'italian', 'tomato', 'vegetarian'],
        notes: 'Base sauce for pasta dishes and pizza'
      },
      yield: {
        quantity: 64,
        unit: 'fl_oz',
        servings: 32,
        portionSize: { amount: 2, unit: 'fl_oz' },
        description: 'Makes 2 quarts of sauce'
      },
      timing: {
        prepTime: 15,
        cookTime: 45,
        totalTime: 60,
        shelfLife: 72
      },
      instructions: [
        {
          id: 'step-1',
          step: 1,
          title: 'Prep aromatics',
          instruction: 'Dice onions finely, mince garlic, chop fresh basil',
          duration: 10,
          equipment: ['knife', 'cutting_board']
        },
        {
          id: 'step-2',
          step: 2,
          title: 'Sauté base',
          instruction: 'Heat olive oil, sauté onions until translucent, add garlic',
          duration: 8,
          temperature: { value: 350, unit: 'fahrenheit' },
          equipment: ['heavy_pot', 'wooden_spoon']
        },
        {
          id: 'step-3',
          step: 3,
          title: 'Add tomatoes',
          instruction: 'Add crushed tomatoes, tomato paste, bring to simmer',
          duration: 5,
          equipment: ['can_opener']
        },
        {
          id: 'step-4',
          step: 4,
          title: 'Season and simmer',
          instruction: 'Add salt, pepper, sugar, basil. Simmer 30 minutes, stirring occasionally',
          duration: 32,
          temperature: { value: 185, unit: 'fahrenheit' },
          tips: ['Taste and adjust seasoning', 'Sauce should coat the back of a spoon']
        }
      ],
      ingredients: [
        {
          id: 'ing-1',
          inventoryItemId: 'item_3', // Olive oil from inventory
          name: 'Extra Virgin Olive Oil',
          quantity: { amount: 3, unit: 'tbsp', isOptional: false },
          cost: { unitCost: 0.02, totalCost: 0.06, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: true,
          order: 1
        },
        {
          id: 'ing-2',
          inventoryItemId: 'onion-yellow-001',
          name: 'Yellow Onion',
          quantity: { amount: 1, unit: 'medium', isOptional: false },
          preparation: { method: 'diced', size: 'fine' },
          cost: { unitCost: 0.50, totalCost: 0.50, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: true,
          order: 2
        },
        {
          id: 'ing-3',
          inventoryItemId: 'garlic-fresh-001',
          name: 'Fresh Garlic',
          quantity: { amount: 4, unit: 'cloves', isOptional: false },
          preparation: { method: 'minced' },
          cost: { unitCost: 0.05, totalCost: 0.20, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: true,
          order: 3
        },
        {
          id: 'ing-4',
          inventoryItemId: 'tomatoes-crushed-001',
          name: 'San Marzano Crushed Tomatoes',
          quantity: { amount: 56, unit: 'fl_oz', isOptional: false },
          cost: { unitCost: 0.04, totalCost: 2.24, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: true,
          order: 4
        },
        {
          id: 'ing-5',
          inventoryItemId: 'tomato-paste-001',
          name: 'Tomato Paste',
          quantity: { amount: 2, unit: 'tbsp', isOptional: false },
          cost: { unitCost: 0.15, totalCost: 0.30, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: false,
          order: 5
        },
        {
          id: 'ing-6',
          inventoryItemId: 'basil-fresh-001',
          name: 'Fresh Basil',
          quantity: { amount: 8, unit: 'leaves', isOptional: true },
          preparation: { method: 'chopped', notes: 'Add at end of cooking' },
          cost: { unitCost: 0.05, totalCost: 0.40, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: false,
          order: 6
        }
      ],
      equipment: ['heavy_pot', 'knife', 'cutting_board', 'wooden_spoon', 'can_opener'],
      nutrition: {
        calories: 25,
        protein: 1,
        carbs: 6,
        fat: 1,
        fiber: 1,
        sodium: 150,
        allergens: []
      },
      costing: {
        totalIngredientCost: 3.70,
        costPerServing: 0.12,
        costPerUnit: 0.06,
        laborCostPerBatch: 5.00,
        overheadCostPerBatch: 2.00,
        totalCostPerBatch: 10.70,
        currency: 'USD',
        lastCalculated: new Date().toISOString()
      },
      quality: {
        targetTemperature: { serving: 165, unit: 'fahrenheit' },
        criticalControlPoints: ['Proper simmering temperature', 'Storage temperature']
      },
      production: {
        batchSize: { min: 32, max: 256, optimal: 128, unit: 'fl_oz' },
        scalable: true,
        makeAhead: true,
        freezable: true,
        requirements: ['Heavy-bottomed pot required', 'Quality canned tomatoes essential']
      }
    },
    {
      name: 'Caesar Salad',
      description: 'Classic Caesar salad with romaine, parmesan, croutons, and house-made dressing',
      category: 'salad',
      type: 'finished_dish',
      difficulty: 'easy',
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'chef-admin',
        version: 1,
        isActive: true,
        tags: ['salad', 'caesar', 'vegetarian', 'classic'],
        notes: 'Popular appetizer and light meal option'
      },
      yield: {
        quantity: 1,
        unit: 'serving',
        servings: 1,
        portionSize: { amount: 8, unit: 'oz' },
        description: 'One large salad serving'
      },
      timing: {
        prepTime: 8,
        cookTime: 0,
        totalTime: 8,
        shelfLife: 1
      },
      instructions: [
        {
          id: 'step-1',
          step: 1,
          title: 'Prep lettuce',
          instruction: 'Wash romaine lettuce, dry thoroughly, chop into bite-sized pieces',
          duration: 4,
          equipment: ['knife', 'cutting_board', 'salad_spinner']
        },
        {
          id: 'step-2',
          step: 2,
          title: 'Prepare toppings',
          instruction: 'Grate fresh parmesan, prepare croutons',
          duration: 2,
          equipment: ['grater']
        },
        {
          id: 'step-3',
          step: 3,
          title: 'Dress and toss',
          instruction: 'Toss lettuce with Caesar dressing, add parmesan and croutons',
          duration: 2,
          equipment: ['salad_bowl', 'tongs']
        }
      ],
      ingredients: [
        {
          id: 'ing-1',
          inventoryItemId: 'lettuce-romaine-001',
          name: 'Romaine Lettuce',
          quantity: { amount: 6, unit: 'oz', isOptional: false },
          preparation: { method: 'chopped', size: 'bite-sized pieces' },
          cost: { unitCost: 0.25, totalCost: 1.50, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: true,
          order: 1
        },
        {
          id: 'ing-2',
          inventoryItemId: 'cheese-parmesan-001',
          name: 'Parmesan Cheese',
          quantity: { amount: 1, unit: 'oz', isOptional: false },
          preparation: { method: 'grated', notes: 'Fresh grated preferred' },
          cost: { unitCost: 0.80, totalCost: 0.80, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: true,
          order: 2
        },
        {
          id: 'ing-3',
          inventoryItemId: 'croutons-house-001',
          name: 'House-made Croutons',
          quantity: { amount: 1, unit: 'oz', isOptional: true },
          cost: { unitCost: 0.30, totalCost: 0.30, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: false,
          order: 3
        },
        {
          id: 'ing-4',
          inventoryItemId: 'dressing-caesar-001',
          name: 'Caesar Dressing',
          quantity: { amount: 2, unit: 'tbsp', isOptional: false },
          cost: { unitCost: 0.12, totalCost: 0.24, currency: 'USD', lastUpdated: new Date().toISOString() },
          isCritical: true,
          order: 4
        }
      ],
      equipment: ['knife', 'cutting_board', 'salad_spinner', 'grater', 'salad_bowl', 'tongs'],
      nutrition: {
        calories: 320,
        protein: 12,
        carbs: 18,
        fat: 24,
        fiber: 6,
        sodium: 680,
        allergens: ['dairy', 'gluten', 'eggs']
      },
      costing: {
        totalIngredientCost: 2.84,
        costPerServing: 2.84,
        costPerUnit: 2.84,
        laborCostPerBatch: 1.00,
        overheadCostPerBatch: 0.50,
        totalCostPerBatch: 4.34,
        currency: 'USD',
        lastCalculated: new Date().toISOString()
      },
      quality: {
        criticalControlPoints: ['Fresh lettuce quality', 'Proper washing', 'Temperature control']
      },
      production: {
        batchSize: { min: 1, max: 10, optimal: 4, unit: 'serving' },
        scalable: true,
        makeAhead: false,
        freezable: false,
        requirements: ['Fresh ingredients only', 'Serve immediately after dressing']
      }
    }
  ];

  // Create recipe records
  sampleRecipes.forEach((recipe, index) => {
    const id = `recipe_${index + 1}`;
    mockRecipes.set(id, { ...recipe, id });
  });

  console.log('🍽️ MSW: Initialized', mockRecipes.size, 'sample recipes');
}

// Validation helpers
const validateRecipeName = (name: string): string | null => {
  if (!name || name.trim().length === 0) {
    return 'Recipe name is required';
  }
  if (name.length < 3) {
    return 'Recipe name must be at least 3 characters';
  }
  if (name.length > 100) {
    return 'Recipe name must be 100 characters or less';
  }
  return null;
};

const validateYield = (yieldData: any): string | null => {
  if (!yieldData || !yieldData.quantity || yieldData.quantity <= 0) {
    return 'Recipe yield quantity must be greater than 0';
  }
  if (!yieldData.unit) {
    return 'Recipe yield unit is required';
  }
  return null;
};

const validateIngredients = (ingredients: RecipeIngredient[], isUpdate: boolean = false): string | null => {
  // Allow empty ingredients during initial recipe creation, but require them for updates
  if (isUpdate && (!ingredients || ingredients.length === 0)) {
    return 'Recipe must have at least one ingredient';
  }
  
  for (const ingredient of ingredients || []) {
    if (!ingredient.inventoryItemId) {
      return `Ingredient "${ingredient.name}" must be linked to an inventory item`;
    }
    if (!ingredient.quantity.amount || ingredient.quantity.amount <= 0) {
      return `Ingredient "${ingredient.name}" must have quantity greater than 0`;
    }
    if (!ingredient.quantity.unit) {
      return `Ingredient "${ingredient.name}" must have a unit specified`;
    }
  }
  
  return null;
};

// MSW API Handlers
export const recipeApiHandlers = [
  // GET /api/recipes - List recipes with filtering
  http.get('/api/recipes', async ({ request }) => {
    initializeMockRecipes();

    const url = new URL(request.url);
    const category = url.searchParams.get('category') as RecipeCategory;
    const type = url.searchParams.get('type') as RecipeType;
    const difficulty = url.searchParams.get('difficulty') as Recipe['difficulty'];
    const isActive = url.searchParams.get('isActive') === 'true';
    const hasIngredient = url.searchParams.get('hasIngredient');
    const maxPrepTime = parseInt(url.searchParams.get('maxPrepTime') || '0');
    const maxCost = parseFloat(url.searchParams.get('maxCost') || '0');
    const search = url.searchParams.get('search');
    const tags = url.searchParams.get('tags')?.split(',') || [];
    const sortBy = url.searchParams.get('sortBy') || 'name';
    const sortOrder = url.searchParams.get('sortOrder') || 'asc';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let recipes = Array.from(mockRecipes.values());

    // Apply filters
    if (category) {
      recipes = recipes.filter(recipe => recipe.category === category);
    }
    if (type) {
      recipes = recipes.filter(recipe => recipe.type === type);
    }
    if (difficulty) {
      recipes = recipes.filter(recipe => recipe.difficulty === difficulty);
    }
    if (isActive !== undefined) {
      recipes = recipes.filter(recipe => recipe.metadata.isActive === isActive);
    }
    if (hasIngredient) {
      recipes = recipes.filter(recipe => 
        recipe.ingredients.some(ing => ing.inventoryItemId === hasIngredient)
      );
    }
    if (maxPrepTime > 0) {
      recipes = recipes.filter(recipe => recipe.timing.prepTime <= maxPrepTime);
    }
    if (maxCost > 0) {
      recipes = recipes.filter(recipe => recipe.costing.totalIngredientCost <= maxCost);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      recipes = recipes.filter(recipe => 
        recipe.name.toLowerCase().includes(searchLower) ||
        recipe.description?.toLowerCase().includes(searchLower) ||
        recipe.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    if (tags.length > 0) {
      recipes = recipes.filter(recipe =>
        tags.some(tag => recipe.metadata.tags.includes(tag))
      );
    }

    // Apply sorting
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
    const total = recipes.length;
    const paginatedRecipes = recipes.slice(offset, offset + limit);

    console.log('🍽️ MSW: Recipes API called, returning', paginatedRecipes.length, 'of', total, 'recipes');
    return HttpResponse.json({
      recipes: paginatedRecipes,
      total,
      offset,
      limit
    });
  }),

  // GET /api/recipes/:id - Get recipe by ID
  http.get('/api/recipes/:id', async ({ params }) => {
    initializeMockRecipes();
    const { id } = params;
    const recipe = mockRecipes.get(id as string);
    
    if (!recipe) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Recipe not found'
      });
    }

    console.log('🍽️ MSW: Recipe by ID API called for', id);
    return HttpResponse.json(recipe);
  }),

  // POST /api/recipes - Create new recipe
  http.post('/api/recipes', async ({ request }) => {
    const recipeData = await request.json() as Partial<Recipe>;
    
    // Validate input
    const nameError = validateRecipeName(recipeData.name || '');
    if (nameError) {
      return new HttpResponse(JSON.stringify({ error: nameError }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const yieldError = validateYield(recipeData.yield);
    if (yieldError) {
      return new HttpResponse(JSON.stringify({ error: yieldError }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ingredientsError = validateIngredients(recipeData.ingredients || [], false);
    if (ingredientsError) {
      return new HttpResponse(JSON.stringify({ error: ingredientsError }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create recipe
    const recipeId = `recipe_${nextRecipeId++}`;
    const now = new Date().toISOString();
    
    const newRecipe: Recipe = {
      id: recipeId,
      name: recipeData.name!.trim(),
      description: recipeData.description?.trim() || '',
      category: recipeData.category || 'main_course',
      type: recipeData.type || 'finished_dish',
      difficulty: recipeData.difficulty || 'medium',
      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy: 'current-user',
        version: 1,
        isActive: true,
        tags: recipeData.metadata?.tags || [],
        notes: recipeData.metadata?.notes || ''
      },
      yield: recipeData.yield!,
      timing: {
        prepTime: recipeData.timing?.prepTime || 0,
        cookTime: recipeData.timing?.cookTime || 0,
        totalTime: (recipeData.timing?.prepTime || 0) + (recipeData.timing?.cookTime || 0),
        ...(recipeData.timing?.restTime && { restTime: recipeData.timing.restTime }),
        ...(recipeData.timing?.shelfLife && { shelfLife: recipeData.timing.shelfLife })
      },
      instructions: recipeData.instructions || [],
      ingredients: recipeData.ingredients || [],
      equipment: recipeData.equipment || [],
      ...(recipeData.nutrition && { nutrition: recipeData.nutrition }),
      costing: {
        totalIngredientCost: 0,
        costPerServing: 0,
        costPerUnit: 0,
        ...(recipeData.costing?.laborCostPerBatch && { laborCostPerBatch: recipeData.costing.laborCostPerBatch }),
        ...(recipeData.costing?.overheadCostPerBatch && { overheadCostPerBatch: recipeData.costing.overheadCostPerBatch }),
        totalCostPerBatch: 0,
        currency: 'USD',
        lastCalculated: now
      },
      quality: recipeData.quality || {},
      production: {
        batchSize: {
          min: 1,
          max: 10,
          optimal: 5,
          unit: recipeData.yield!.unit
        },
        scalable: true,
        makeAhead: false,
        freezable: false,
        ...recipeData.production
      }
    };

    // Calculate initial costs (simplified)
    let totalCost = 0;
    for (const ingredient of newRecipe.ingredients) {
      if (ingredient.cost?.totalCost) {
        totalCost += ingredient.cost.totalCost;
      }
    }
    
    newRecipe.costing.totalIngredientCost = totalCost;
    newRecipe.costing.costPerServing = totalCost / (newRecipe.yield.servings || newRecipe.yield.quantity);
    newRecipe.costing.costPerUnit = totalCost / newRecipe.yield.quantity;
    newRecipe.costing.totalCostPerBatch = totalCost + (newRecipe.costing.laborCostPerBatch || 0) + (newRecipe.costing.overheadCostPerBatch || 0);

    mockRecipes.set(recipeId, newRecipe);

    console.log('🍽️ MSW: Created new recipe:', newRecipe.name);
    return HttpResponse.json(newRecipe, { status: 201 });
  }),

  // PATCH /api/recipes/:id - Update recipe
  http.patch('/api/recipes/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json() as Partial<Recipe>;
    
    const recipe = mockRecipes.get(id as string);
    if (!recipe) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Recipe not found'
      });
    }

    if (!recipe.metadata.isActive) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Cannot update inactive recipe' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate updates
    if (updates.name) {
      const nameError = validateRecipeName(updates.name);
      if (nameError) {
        return new HttpResponse(JSON.stringify({ error: nameError }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (updates.yield) {
      const yieldError = validateYield(updates.yield);
      if (yieldError) {
        return new HttpResponse(JSON.stringify({ error: yieldError }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    if (updates.ingredients) {
      const ingredientsError = validateIngredients(updates.ingredients, true);
      if (ingredientsError) {
        return new HttpResponse(JSON.stringify({ error: ingredientsError }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Apply updates
    const updatedRecipe = { 
      ...recipe, 
      ...updates,
      metadata: {
        ...recipe.metadata,
        ...updates.metadata,
        updatedAt: new Date().toISOString(),
        version: recipe.metadata.version + 1
      }
    };

    // Recalculate timing if prep/cook time changed
    if (updates.timing) {
      updatedRecipe.timing.totalTime = updatedRecipe.timing.prepTime + updatedRecipe.timing.cookTime;
    }

    // Recalculate costs if ingredients changed
    if (updates.ingredients) {
      let totalCost = 0;
      for (const ingredient of updatedRecipe.ingredients) {
        if (ingredient.cost?.totalCost) {
          totalCost += ingredient.cost.totalCost;
        }
      }
      
      updatedRecipe.costing.totalIngredientCost = totalCost;
      updatedRecipe.costing.costPerServing = totalCost / (updatedRecipe.yield.servings || updatedRecipe.yield.quantity);
      updatedRecipe.costing.costPerUnit = totalCost / updatedRecipe.yield.quantity;
      updatedRecipe.costing.totalCostPerBatch = totalCost + (updatedRecipe.costing.laborCostPerBatch || 0) + (updatedRecipe.costing.overheadCostPerBatch || 0);
      updatedRecipe.costing.lastCalculated = new Date().toISOString();
    }

    mockRecipes.set(id as string, updatedRecipe);

    console.log('🍽️ MSW: Updated recipe:', updatedRecipe.name);
    return HttpResponse.json(updatedRecipe);
  }),

  // DELETE /api/recipes/:id - Deactivate recipe
  http.delete('/api/recipes/:id', async ({ params }) => {
    const { id } = params;
    const recipe = mockRecipes.get(id as string);
    
    if (!recipe) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Recipe not found'
      });
    }

    if (!recipe.metadata.isActive) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Recipe is already inactive' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Mark as inactive instead of deleting
    const deactivatedRecipe = { 
      ...recipe, 
      metadata: {
        ...recipe.metadata,
        isActive: false,
        updatedAt: new Date().toISOString()
      }
    };
    
    mockRecipes.set(id as string, deactivatedRecipe);

    console.log('🍽️ MSW: Deactivated recipe:', recipe.name);
    return HttpResponse.json({ message: 'Recipe deactivated successfully' });
  }),

  // POST /api/recipes/:id/calculate-cost - Calculate recipe cost
  http.post('/api/recipes/:id/calculate-cost', async ({ params, request }) => {
    const { id } = params;
    const options = await request.json() as CostCalculationOptions;
    
    const recipe = mockRecipes.get(id as string);
    if (!recipe) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Recipe not found'
      });
    }

    // Simplified cost calculation for demo
    let totalCost = recipe.costing.totalIngredientCost;
    
    if (options.scaleTo && options.scaleTo !== recipe.yield.quantity) {
      const scaleFactor = options.scaleTo / recipe.yield.quantity;
      totalCost *= scaleFactor;
    }

    if (options.includeLabor && recipe.costing.laborCostPerBatch) {
      totalCost += recipe.costing.laborCostPerBatch;
    }

    if (options.includeOverhead && recipe.costing.overheadCostPerBatch) {
      totalCost += recipe.costing.overheadCostPerBatch;
    }

    const costAnalysis = {
      recipeId: id,
      totalCost,
      costPerServing: totalCost / (recipe.yield.servings || recipe.yield.quantity),
      costPerUnit: totalCost / recipe.yield.quantity,
      breakdown: {
        ingredients: recipe.costing.totalIngredientCost,
        labor: options.includeLabor ? (recipe.costing.laborCostPerBatch || 0) : 0,
        overhead: options.includeOverhead ? (recipe.costing.overheadCostPerBatch || 0) : 0
      },
      calculatedAt: new Date().toISOString(),
      options
    };

    console.log('🍽️ MSW: Calculated cost for recipe:', recipe.name, '- $', totalCost.toFixed(2));
    return HttpResponse.json(costAnalysis);
  }),

  // POST /api/recipes/:id/scale - Scale recipe
  http.post('/api/recipes/:id/scale', async ({ params, request }) => {
    const { id } = params;
    const { targetYield } = await request.json() as { targetYield: number };
    
    const recipe = mockRecipes.get(id as string);
    if (!recipe) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Recipe not found'
      });
    }

    if (!recipe.production.scalable) {
      return new HttpResponse(JSON.stringify({ 
        error: 'Recipe is not scalable' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const scaleFactor = targetYield / recipe.yield.quantity;
    
    const scaledRecipe: RecipeScale = {
      originalYield: recipe.yield.quantity,
      targetYield,
      scaleFactor,
      scaledIngredients: recipe.ingredients.map(ingredient => ({
        ingredientId: ingredient.id,
        originalAmount: ingredient.quantity.amount,
        scaledAmount: ingredient.quantity.amount * scaleFactor,
        unit: ingredient.quantity.unit
      })),
      scaledTiming: {
        prepTime: Math.ceil(recipe.timing.prepTime * Math.sqrt(scaleFactor)),
        cookTime: recipe.timing.cookTime,
        totalTime: Math.ceil(recipe.timing.prepTime * Math.sqrt(scaleFactor)) + recipe.timing.cookTime
      },
      warnings: scaleFactor > 5 ? ['Large scaling factor may affect cooking times'] : 
               scaleFactor < 0.25 ? ['Very small batches may be difficult to execute'] : [],
      notes: [
        `Scaled by factor of ${scaleFactor.toFixed(2)}`,
        'Cooking times may need adjustment',
        'Taste and adjust seasonings after scaling'
      ]
    };

    console.log('🍽️ MSW: Scaled recipe:', recipe.name, 'to', targetYield, recipe.yield.unit);
    return HttpResponse.json(scaledRecipe);
  }),

  // GET /api/recipes/categories - Get recipe categories
  http.get('/api/recipes/categories', async () => {
    console.log('🍽️ MSW: Recipe categories API called');
    return HttpResponse.json(RECIPE_CATEGORIES);
  }),

  // GET /api/recipes/templates - Get recipe templates
  http.get('/api/recipes/templates', async () => {
    console.log('🍽️ MSW: Recipe templates API called');
    return HttpResponse.json(RECIPE_TEMPLATES);
  }),

  // GET /api/recipes/:id/analytics - Get recipe analytics
  http.get('/api/recipes/:id/analytics', async ({ params }) => {
    const { id } = params;
    const recipe = mockRecipes.get(id as string);
    
    if (!recipe) {
      return new HttpResponse(null, { 
        status: 404,
        statusText: 'Recipe not found'
      });
    }

    // Mock analytics data
    const analytics: RecipeAnalytics = {
      recipeId: id as string,
      recipeName: recipe.name,
      popularity: {
        timesOrdered: Math.floor(Math.random() * 500) + 100,
        averageOrdersPerDay: Math.floor(Math.random() * 20) + 5,
        peakOrderTimes: [
          { hour: 12, orderCount: 25 },
          { hour: 13, orderCount: 30 },
          { hour: 18, orderCount: 35 },
          { hour: 19, orderCount: 40 },
          { hour: 20, orderCount: 28 }
        ],
        seasonalTrends: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          orderCount: Math.floor(Math.random() * 100) + 50
        }))
      },
      costPerformance: {
        averageIngredientCost: recipe.costing.totalIngredientCost,
        costTrend: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          cost: recipe.costing.totalIngredientCost + (Math.random() - 0.5) * 2
        })),
        costVariance: (Math.random() - 0.5) * 20,
        profitabilityScore: Math.floor(Math.random() * 40) + 60
      },
      production: {
        averagePrepTime: recipe.timing.prepTime + Math.floor(Math.random() * 5),
        prepTimeVariance: Math.random() * 15,
        yieldConsistency: 85 + Math.random() * 15,
        qualityScoreAverage: 8.5 + Math.random() * 1.5,
        wastePercentage: Math.random() * 5
      },
      feedback: {
        averageRating: 4.2 + Math.random() * 0.8,
        totalReviews: Math.floor(Math.random() * 200) + 50,
        commonComplaints: ['Temperature could be warmer', 'Portion size'],
        commonPraises: ['Great flavor', 'Perfect texture', 'Excellent presentation']
      }
    };

    console.log('🍽️ MSW: Recipe analytics API called for', recipe.name);
    return HttpResponse.json(analytics);
  })
];

// Helper functions for calculations
export function calculateRecipeCost(recipe: Recipe): number {
  return recipe.ingredients.reduce((total, ingredient) => {
    return total + (ingredient.cost?.totalCost || 0);
  }, 0);
}

export function scaleRecipeIngredients(ingredients: RecipeIngredient[], scaleFactor: number): RecipeIngredient[] {
  return ingredients.map(ingredient => ({
    ...ingredient,
    quantity: {
      ...ingredient.quantity,
      amount: ingredient.quantity.amount * scaleFactor
    },
    cost: ingredient.cost ? {
      ...ingredient.cost,
      totalCost: ingredient.cost.totalCost * scaleFactor
    } : ingredient.cost
  }));
}
