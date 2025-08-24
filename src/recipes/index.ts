/**
 * Recipe & BOM Management Module
 * 
 * Comprehensive recipe management system with cost analysis,
 * inventory integration, and production planning.
 */

// Core Types
export type {
  Recipe,
  RecipeIngredient,
  RecipeInstruction,
  RecipeSubstitution,
  RecipeCategory,
  RecipeType,
  RecipeQuery,
  RecipeValidation,
  RecipeScale,
  MenuItemRecipe,
  BatchProduction,
  RecipeAnalytics,
  CostCalculationOptions,
  // Event Types
  RecipeCreatedEvent,
  RecipeUpdatedEvent,
  RecipeCostCalculatedEvent,
  BatchProductionStartedEvent,
  BatchProductionCompletedEvent,
  InventoryDeductedEvent
} from './types';

// Constants and Templates
export { 
  RECIPE_CATEGORIES, 
  RECIPE_TEMPLATES 
} from './types';

// Service Layer
export { 
  createRecipeService,
  getRecipeService,
  type RecipeService 
} from './service';

// API Handlers
export { 
  recipeApiHandlers,
  calculateRecipeCost,
  scaleRecipeIngredients 
} from './api';

// React Components
export { default as RecipeManagement } from '../components/RecipeManagement';
