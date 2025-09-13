# Menu Module Implementation Plan

## Executive Summary

This document outlines the implementation plan for the Menu module in RMS v3, with a clear separation between Menu (customer-facing products) and Inventory (raw materials). The design is based on best practices from leading POS systems like Foodics, Square, and Toast.

## Core Concepts

### Menu vs Inventory: The Key Distinction

1. **Menu Items** (What customers order)
   - Finished products displayed to customers
   - Have selling prices
   - Can include modifiers and variations
   - Examples: "Cheeseburger", "Caesar Salad", "Cappuccino"

2. **Inventory Items** (What the restaurant purchases)
   - Raw materials and ingredients
   - Have purchase costs
   - Tracked in units (kg, liters, pieces)
   - Examples: "Ground Beef", "Lettuce", "Coffee Beans"

3. **Recipes** (The connection)
   - Define how menu items consume inventory
   - Specify quantities of each ingredient
   - Enable automatic inventory depletion on sales
   - Calculate food cost and profit margins

## Simplified Architecture

```
Customer Orders → Menu Item → Recipe → Inventory Depletion
                     ↓
                Modifiers
```

## Implementation Phases

### Phase 1: Core Menu Management (MUST HAVE)

#### 1.1 Menu Categories
- **Purpose**: Organize menu items for easy navigation
- **Features**:
  - Create/edit/delete categories
  - Set display order
  - Enable/disable categories
  - Assign to specific branches
- **Data Model**:
  ```typescript
  interface MenuCategory {
    id: string;
    name: string;
    displayOrder: number;
    isActive: boolean;
    branchIds: string[];
    createdAt: Date;
    updatedAt: Date;
  }
  ```

#### 1.2 Menu Items
- **Purpose**: Define products customers can purchase
- **Features**:
  - Basic item details (name, description, price)
  - Category assignment
  - Availability schedule
  - Branch-specific availability
  - Simple stock tracking (in stock/out of stock)
- **Data Model**:
  ```typescript
  interface MenuItem {
    id: string;
    sku: string;
    name: string;
    description?: string;
    categoryId: string;
    price: number;
    taxRate: number;
    isActive: boolean;
    isAvailable: boolean; // Manual availability toggle
    branchIds: string[];
    // Phase 2 additions
    recipeId?: string;
    modifierGroups?: string[];
    createdAt: Date;
    updatedAt: Date;
  }
  ```

### Phase 2: Recipe Management (SHOULD HAVE)

#### 2.1 Simple Recipe System
- **Purpose**: Link menu items to inventory consumption
- **Features**:
  - Define ingredients and quantities
  - Calculate cost per menu item
  - Automatic inventory depletion on sale
- **Data Model**:
  ```typescript
  interface Recipe {
    id: string;
    menuItemId: string;
    ingredients: RecipeIngredient[];
    yield: number; // How many portions this recipe makes
    cost: number; // Calculated from ingredients
  }
  
  interface RecipeIngredient {
    inventoryItemId: string;
    quantity: number;
    unit: string;
  }
  ```

### Phase 3: Modifiers (NICE TO HAVE)

#### 3.1 Modifier Groups
- **Purpose**: Allow customization of menu items
- **Features**:
  - Create modifier groups (Size, Add-ons, etc.)
  - Set min/max selections
  - Price adjustments
- **Examples**:
  - Size: Small (+$0), Medium (+$2), Large (+$4)
  - Add-ons: Extra Cheese (+$1), Bacon (+$2)

## Key Design Decisions

### 1. Keep Menu and Inventory Separate
- Menu items are not inventory items
- Menu focuses on sales, inventory on stock
- Connected only through recipes

### 2. Manual Availability First
- Start with simple "available/unavailable" toggle
- Automatic availability based on inventory comes later
- Reduces complexity and bugs

### 3. Branch-Scoped from Day One
- All menu items can be branch-specific
- Supports different menus per location
- Uses existing branch infrastructure

### 4. Event-Driven Updates
- `menu.category.created`
- `menu.item.created`
- `menu.item.updated`
- `menu.item.availability.changed`

## Implementation Order

1. **Categories Management** (2 days)
   - CRUD interface
   - Display ordering
   - Branch assignment

2. **Menu Items Management** (3 days)
   - CRUD interface
   - Search and filter
   - Bulk operations
   - Manual availability toggle

3. **POS Integration** (2 days)
   - Replace mock data with real menu
   - Category filtering
   - Availability checking

4. **Recipe Builder** (3 days)
   - Link menu items to inventory
   - Cost calculation
   - Depletion logic

5. **Modifiers** (2 days)
   - Modifier groups
   - Price adjustments
   - POS integration

## What We're NOT Building (Yet)

1. **Complex Menu Scheduling**: No time-based menus initially
2. **Nutritional Information**: Can be added as metadata later
3. **Menu Versioning**: No historical menu tracking
4. **Combo Meals**: Too complex for initial version
5. **Dynamic Pricing**: No time-based or demand-based pricing

## Integration Points

### With Inventory Module
- Recipes consume inventory items
- Inventory audit can mark items unavailable
- Cost calculation from current inventory prices

### With POS Module
- Real-time menu data
- Modifier selection
- Availability checking

### With Reports Module
- Menu performance analytics
- Item popularity
- Profit margin analysis

## Technical Implementation

### API Endpoints
```
/api/menu/categories
/api/menu/items
/api/menu/items/:id/availability
/api/menu/recipes
/api/menu/modifiers
```

### Events
```typescript
// Category events
'menu.category.created'
'menu.category.updated'
'menu.category.deleted'

// Item events
'menu.item.created'
'menu.item.updated'
'menu.item.deleted'
'menu.item.availability.changed'

// Recipe events
'menu.recipe.created'
'menu.recipe.updated'
```

### State Management
- Use existing patterns (Zustand for UI state)
- Event store for business events
- Real-time updates via event system

## Success Metrics

1. **Simplicity**: Can create a menu item in < 30 seconds
2. **Flexibility**: Support 80% of restaurant needs
3. **Performance**: Menu loads in < 500ms
4. **Reliability**: Zero menu-related POS failures

## Migration Path

For existing systems:
1. Import categories first
2. Import menu items with basic data
3. Add recipes incrementally
4. Enable inventory depletion when ready

## Conclusion

This plan focuses on building a simple, reliable menu system that clearly separates customer-facing products from inventory management. By starting with core features and adding complexity gradually, we ensure a stable foundation for the POS system.

The key insight is that **customers order menu items, not inventory items**. This separation simplifies both the mental model and the implementation, leading to fewer bugs and easier maintenance.
