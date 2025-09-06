/**
 * UI Text Constants
 * Centralized text strings for consistency and potential i18n
 */

// Form Labels and Placeholders
export const FORM_LABELS = {
  // Inventory Operations
  REFERENCE_NUMBER: 'Reference Number',
  SUPPLIER: 'Supplier',
  ADJUSTMENT_REASON: 'Adjustment Reason',
  NOTES: 'Notes',
  ITEM: 'Item',
  CURRENT_STOCK: 'Current Stock',
  RECEIVED_QUANTITY: 'Received Quantity',
  UNIT_COST: 'Unit Cost',
  LOT_NUMBER: 'Lot Number',
  EXPIRY_DATE: 'Expiry Date',
  
  // Form Actions
  ADD_ITEM: 'Add Item',
  REMOVE: 'Remove',
  CANCEL: 'Cancel',
  SAVE: 'Save',
  SUBMIT: 'Submit',
  PROCESSING: 'Processing...',
  SUBMITTING: 'Submitting...',
  
  // Category Management
  CREATE_CATEGORY: 'Create Category',
  UPDATE_CATEGORY: 'Update Category',
  CREATE_FIRST_CATEGORY: 'Create First Category',
  EDIT: 'Edit',
  ARCHIVE: 'Archive',
  DELETE_ROLE: 'Delete Role',
  
  // Common Actions
  ADD_SUPPLIER: 'Add Supplier',
  SAVE_PRODUCT: 'Save Product',
  CREATE_ROLE: 'Create Role',
  UPDATE_ROLE: 'Update Role',
  
  // General
  GENERAL_INFORMATION: 'General Information',
  REQUIRED_INDICATOR: '*',
} as const;

// Form Placeholders
export const FORM_PLACEHOLDERS = {
  REFERENCE_NUMBER: 'PO-2024-001, ADJ-001, COUNT-001...',
  NOTES: 'Additional notes about this operation...',
  ADJUSTMENT_NOTES: 'Specific notes for this adjustment...',
  UNIT_COST: '0.00',
  LOT_NUMBER: 'Enter lot number',
  SELECT_ITEM: 'Select an item...',
} as const;

// Help Text
export const HELP_TEXT = {
  REFERENCE_NUMBER: 'Optional reference number for tracking',
  SUPPLIER: 'Select the supplier for this delivery',
  ADJUSTMENT_REASON: 'Reason for the inventory adjustment',
} as const;

// Messages
export const MESSAGES = {
  NO_ITEMS_ADDED: 'No items added yet. Click "Add Item" to get started.',
  ADD_AT_LEAST_ONE_ITEM: 'Please add at least one item',
  FILL_REQUIRED_FIELDS: 'Please fill in all required fields for each item',
  DISCARD_CHANGES: 'Are you sure you want to discard your changes?',
  DRAFT_AUTO_SAVED: 'Draft auto-saved',
  KEYBOARD_SHORTCUTS: '💡 Shortcuts: Ctrl+S to save, Ctrl+Shift+Enter for quick submit',
  
  // Category Management Messages
  NO_CATEGORIES_YET: 'No categories yet',
  NO_CATEGORIES_FOUND: 'No categories found',
  CREATE_FIRST_CATEGORY_DESC: 'Create your first category to start organizing your inventory',
  TRY_ADJUSTING_SEARCH: 'Try adjusting your search criteria',
  
  // Confirmation Messages
  ARCHIVE_CATEGORY_CONFIRM: (name: string) => `Are you sure you want to archive "${name}"? This will hide it from active use but preserve historical data.`,
  SUBCATEGORIES_WARNING: (count: number) => `⚠️ This category has ${count} subcategories. You must archive them first.`,
  ITEMS_WARNING: (count: number) => `⚠️ This category contains ${count} items. They will need to be moved to another category.`,
} as const;

// Operation Configuration
export const OPERATION_CONFIG = {
  receive: {
    title: 'Receive Stock',
    itemTitle: 'Items to Receive',
    quantityField: 'receivedQuantity',
    quantityLabel: 'Received Quantity',
    showCost: true,
    showLotExpiry: true,
    requiresSupplier: true
  },
  adjust: {
    title: 'Adjust Inventory',
    itemTitle: 'Items to Adjust',
    quantityField: 'adjustmentQuantity',
    quantityLabel: 'Adjustment (+/-)',
    showCost: false,
    showLotExpiry: false,
    requiresReason: true
  },
  count: {
    title: 'Stock Count',
    itemTitle: 'Items to Count',
    quantityField: 'countedQuantity',
    quantityLabel: 'Counted Quantity',
    showCost: false,
    showLotExpiry: false,
    requiresReason: false
  }
} as const;

// Supplier Options
export const SUPPLIER_OPTIONS: { value: string; label: string }[] = [
  { value: 'supplier-1', label: 'ABC Food Supply' },
  { value: 'supplier-2', label: 'Fresh Market Distributors' },
  { value: 'supplier-3', label: 'Quality Ingredients Inc.' }
];

// Adjustment Reason Options  
export const ADJUSTMENT_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: 'waste', label: 'Waste/Spoilage' },
  { value: 'damage', label: 'Damage' },
  { value: 'theft', label: 'Theft/Loss' },
  { value: 'correction', label: 'Count Correction' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other', label: 'Other' }
];

// Recipe Management Constants
export const RECIPE_TEXT = {
  // Page Header
  RECIPE_MANAGEMENT: 'Recipe Management',
  CREATE_MANAGE_DESC: 'Create and manage recipes with cost analysis and ingredient tracking',
  ADD_RECIPE: 'Add Recipe',
  
  // Form Labels
  RECIPE_NAME: 'Recipe Name',
  DESCRIPTION: 'Description',
  CATEGORY: 'Category',
  RECIPE_TYPE: 'Recipe Type',
  DIFFICULTY_LEVEL: 'Difficulty Level',
  YIELD_QUANTITY: 'Yield Quantity',
  YIELD_UNIT: 'Yield Unit',
  NUMBER_OF_SERVINGS: 'Number of Servings',
  PREP_TIME_MINUTES: 'Prep Time (minutes)',
  COOK_TIME_MINUTES: 'Cook Time (minutes)',
  SHELF_LIFE_HOURS: 'Shelf Life (hours)',
  TAGS: 'Tags',
  CHEF_NOTES: 'Chef Notes',
  
  // Form Descriptions
  RECIPE_NAME_HELP: 'A clear, descriptive name for the recipe',
  DESCRIPTION_HELP: 'Description that will help staff and customers understand the dish',
  CATEGORY_HELP: 'Primary category for organization and menu grouping',
  TYPE_HELP: 'Type of recipe affects how it\'s used in the kitchen',
  DIFFICULTY_HELP: 'Skill level required to execute this recipe',
  YIELD_QUANTITY_HELP: 'How much this recipe makes',
  YIELD_UNIT_HELP: 'Unit of measurement for the yield',
  SERVINGS_HELP: 'How many servings this recipe provides (if different from yield)',
  PREP_TIME_HELP: 'Time needed for preparation before cooking',
  COOK_TIME_HELP: 'Active cooking/baking time',
  SHELF_LIFE_HELP: 'How long the finished product stays fresh',
  TAGS_HELP: 'Comma-separated tags for easy searching and organization',
  NOTES_HELP: 'Internal notes for kitchen staff and management',
  
  // Form Actions
  CREATE_RECIPE: 'Create Recipe',
  UPDATE_RECIPE: 'Update Recipe',
  CREATE_NEW_RECIPE: 'Create New Recipe',
  EDIT_RECIPE: 'Edit Recipe',
  
  // Form Descriptions
  CREATE_RECIPE_DESC: 'Enter the basic recipe information. You can add ingredients and instructions after creation.',
  UPDATE_RECIPE_DESC: 'Update the recipe details below',
  
  // Recipe View
  SERVINGS: 'Servings',
  TOTAL_TIME: 'Total Time',
  COST_SERVING: 'Cost/Serving',
  INGREDIENTS: 'Ingredients',
  INSTRUCTIONS: 'Instructions',
  COST_ANALYSIS: 'Cost Analysis',
  INGREDIENT_COST: 'Ingredient Cost:',
  COST_PER_SERVING: 'Cost per Serving:',
  COST_PER_UNIT: 'Cost per Unit:',
  LAST_CALCULATED: 'Last calculated:',
  
  // Empty States
  NO_RECIPES_FOUND: 'No recipes found',
  NO_RECIPES_DESC: 'Add your first recipe to get started with cost management and inventory integration',
  ADJUST_FILTERS_DESC: 'Try adjusting your search or filter criteria',
  
  // Search and Filters
  SEARCH_RECIPES: 'Search recipes...',
  ALL_CATEGORIES: 'All Categories',
  ALL_TYPES: 'All Types',
  ALL_DIFFICULTIES: 'All Difficulties',
  
  // Scaling
  SCALE_RECIPE: 'Scale Recipe',
  ORIGINAL_RECIPE: 'Original Recipe',
  SCALE_TO: 'Scale To',
  TARGET_YIELD: 'Target Yield',
  CALCULATE_SCALE: 'Calculate Scale',
  SCALED_RESULTS: 'Scaled Recipe Results',
  SCALE_FACTOR: 'Scale Factor:',
  NEW_YIELD: 'New Yield:',
  ESTIMATED_PREP: 'Estimated Prep Time:',
  WARNINGS: 'Warnings:',
  SCALED_INGREDIENTS: 'Scaled Ingredients:',
  
  // Stats Labels
  YIELD: 'Yield:',
  PREP_TIME: 'Prep Time:',
  COOK_TIME: 'Cook Time:',
  TOTAL_COST: 'Total Cost:'
} as const;