#!/usr/bin/env node

/**
 * Seed Menu Data Script
 * Generates test menu categories and items through the event system
 * 
 * Usage:
 *   pnpm seed:menu
 */

console.log('🍔 Menu Data Seeder for RMS v3');
console.log('================================\n');

// Since we can't directly import TypeScript modules, we'll use a different approach
// This script creates events that can be processed by the test API server

const categories = [
  { id: 'cat_appetizers', name: 'Appetizers', displayOrder: 1 },
  { id: 'cat_mains', name: 'Main Courses', displayOrder: 2 },
  { id: 'cat_sides', name: 'Sides', displayOrder: 3 },
  { id: 'cat_beverages', name: 'Beverages', displayOrder: 4 },
  { id: 'cat_desserts', name: 'Desserts', displayOrder: 5 }
];

const menuItems = [
  // Appetizers
  { 
    id: 'item_mozz_sticks',
    sku: 'APP-MOZZ-01',
    name: 'Mozzarella Sticks',
    description: 'Golden fried mozzarella served with marinara sauce',
    categoryId: 'cat_appetizers',
    price: 7.99,
    taxRate: 0.15
  },
  { 
    id: 'item_wings',
    sku: 'APP-WING-01',
    name: 'Buffalo Wings',
    description: 'Spicy chicken wings with blue cheese dip',
    categoryId: 'cat_appetizers',
    price: 9.99,
    taxRate: 0.15
  },
  
  // Main Courses
  { 
    id: 'item_burger',
    sku: 'MAIN-BURG-01',
    name: 'Classic Burger',
    description: 'Beef patty with lettuce, tomato, onion, and pickles',
    categoryId: 'cat_mains',
    price: 12.99,
    taxRate: 0.15
  },
  { 
    id: 'item_steak',
    sku: 'MAIN-STEK-01',
    name: 'Grilled Ribeye Steak',
    description: '12oz ribeye steak cooked to perfection',
    categoryId: 'cat_mains',
    price: 28.99,
    taxRate: 0.15
  },
  { 
    id: 'item_pasta',
    sku: 'MAIN-PAST-01',
    name: 'Chicken Alfredo',
    description: 'Creamy alfredo pasta with grilled chicken',
    categoryId: 'cat_mains',
    price: 16.99,
    taxRate: 0.15
  },
  
  // Sides
  { 
    id: 'item_fries',
    sku: 'SIDE-FRIE-01',
    name: 'French Fries',
    description: 'Crispy golden fries',
    categoryId: 'cat_sides',
    price: 3.99,
    taxRate: 0.15
  },
  { 
    id: 'item_salad',
    sku: 'SIDE-SALD-01',
    name: 'Garden Salad',
    description: 'Fresh mixed greens with house dressing',
    categoryId: 'cat_sides',
    price: 5.99,
    taxRate: 0.15
  },
  
  // Beverages
  { 
    id: 'item_coke',
    sku: 'BEV-COKE-01',
    name: 'Coca Cola',
    description: 'Classic cola',
    categoryId: 'cat_beverages',
    price: 2.99,
    taxRate: 0.10
  },
  { 
    id: 'item_juice',
    sku: 'BEV-JUIC-01',
    name: 'Fresh Orange Juice',
    description: 'Freshly squeezed orange juice',
    categoryId: 'cat_beverages',
    price: 4.99,
    taxRate: 0.10
  },
  
  // Desserts
  { 
    id: 'item_brownie',
    sku: 'DES-BROW-01',
    name: 'Chocolate Brownie',
    description: 'Warm chocolate brownie with vanilla ice cream',
    categoryId: 'cat_desserts',
    price: 6.99,
    taxRate: 0.15
  },
  { 
    id: 'item_cheesecake',
    sku: 'DES-CHEE-01',
    name: 'New York Cheesecake',
    description: 'Classic cheesecake with berry compote',
    categoryId: 'cat_desserts',
    price: 7.99,
    taxRate: 0.15
  }
];

const modifierGroups = [
  {
    id: 'mod_grp_size',
    name: 'Size',
    description: 'Choose your portion size',
    type: 'single',
    isRequired: true,
    minSelections: 1,
    maxSelections: 1,
    displayOrder: 1,
    options: [
      { name: 'Small', priceAdjustment: 0, isDefault: true, isActive: true },
      { name: 'Medium', priceAdjustment: 2.50, isActive: true },
      { name: 'Large', priceAdjustment: 4.50, isActive: true }
    ]
  },
  {
    id: 'mod_grp_toppings',
    name: 'Extra Toppings',
    description: 'Add extra toppings to your order',
    type: 'multiple',
    isRequired: false,
    minSelections: 0,
    maxSelections: 5,
    displayOrder: 2,
    options: [
      { name: 'Extra Cheese', priceAdjustment: 1.50, isActive: true },
      { name: 'Bacon', priceAdjustment: 2.00, isActive: true },
      { name: 'Mushrooms', priceAdjustment: 1.00, isActive: true },
      { name: 'Onions', priceAdjustment: 0.50, isActive: true },
      { name: 'Jalapeños', priceAdjustment: 0.75, isActive: true }
    ]
  },
  {
    id: 'mod_grp_cooking',
    name: 'Cooking Style',
    description: 'How would you like it cooked?',
    type: 'single',
    isRequired: false,
    minSelections: 0,
    maxSelections: 1,
    displayOrder: 3,
    options: [
      { name: 'Rare', priceAdjustment: 0, isActive: true },
      { name: 'Medium Rare', priceAdjustment: 0, isDefault: true, isActive: true },
      { name: 'Medium', priceAdjustment: 0, isActive: true },
      { name: 'Well Done', priceAdjustment: 0, isActive: true }
    ]
  }
];

async function seedMenuData() {
  // Try to send events to the test API server if it's running
  const API_BASE = process.env.VITE_API_BASE || 'http://localhost:3001';
  
  async function sendEvent(event) {
    try {
      const response = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Check if API server is running
  let useApi = false;
  try {
    const response = await fetch(`${API_BASE}/health`);
    useApi = response.ok;
  } catch (error) {
    console.log('ℹ️  Test API server not running. To persist data, run: pnpm api:test-server\n');
  }

  console.log('📂 Creating categories...');
  let categoryCount = 0;
  
  for (const category of categories) {
    const event = {
      id: `event_cat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'menu.category.created.v1',
      version: 1,
      at: Date.now(),
      payload: {
        id: category.id,
        name: category.name,
        displayOrder: category.displayOrder,
        isActive: true,
        branchIds: ['main']
      }
    };
    
    if (useApi) {
      const success = await sendEvent(event);
      if (success) {
        categoryCount++;
        console.log(`  ✅ Created category: ${category.name}`);
      } else {
        console.log(`  ❌ Failed to create category: ${category.name}`);
      }
    } else {
      categoryCount++;
      console.log(`  📝 Category ready: ${category.name}`);
    }
  }

  console.log(`\n🍽️  Creating menu items...`);
  let itemCount = 0;
  
  for (const item of menuItems) {
    const now = Date.now();
    const event = {
      id: `event_item_${now}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'menu.item.created',
      at: now,
      payload: {
        id: item.id,
        sku: item.sku,
        name: item.name,
        description: item.description,
        categoryId: item.categoryId,
        price: item.price,
        taxRate: item.taxRate,
        isActive: true,
        isAvailable: true,
        branchIds: ['main'],
        image: '',
        createdAt: now,
        updatedAt: now
      }
    };
    
    if (useApi) {
      const success = await sendEvent(event);
      if (success) {
        itemCount++;
        console.log(`  ✅ Created item: ${item.name} (${item.sku})`);
      } else {
        console.log(`  ❌ Failed to create item: ${item.name}`);
      }
    } else {
      itemCount++;
      console.log(`  📝 Item ready: ${item.name} (${item.sku})`);
    }
  }

  console.log(`\n🎛️  Creating modifier groups...`);
  let modifierCount = 0;
  
  for (const group of modifierGroups) {
    const now = Date.now();
    const event = {
      id: `event_mod_${now}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'modifier-group.created.v1',
      at: now,
      payload: {
        id: group.id,
        name: group.name,
        description: group.description,
        type: group.type,
        isRequired: group.isRequired,
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        displayOrder: group.displayOrder,
        options: group.options.map((opt, index) => ({
          id: `opt_${group.id}_${index}`,
          ...opt
        }))
      }
    };
    
    if (useApi) {
      const success = await sendEvent(event);
      if (success) {
        modifierCount++;
        console.log(`  ✅ Created modifier group: ${group.name}`);
      } else {
        console.log(`  ❌ Failed to create modifier group: ${group.name}`);
      }
    } else {
      modifierCount++;
      console.log(`  📝 Modifier group ready: ${group.name}`);
    }
  }

  console.log('\n✨ Menu data seeding completed!');
  console.log(`  📂 Categories: ${categoryCount}`);
  console.log(`  🍽️  Menu items: ${itemCount}`);
  console.log(`  🎛️  Modifier groups: ${modifierCount}`);
  
  if (useApi) {
    console.log('\n💡 Data sent to test API server');
    console.log('   Start the app with: pnpm api:test');
  } else {
    console.log('\n💡 To persist this data:');
    console.log('   1. Run: pnpm api:test-server');
    console.log('   2. Run this script again');
    console.log('   3. Start app with: pnpm api:test');
  }
}

// Run the seeder
seedMenuData().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
