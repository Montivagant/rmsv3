/**
 * Unified search service that searches across all business entities
 */

import { useState, useCallback } from 'react';

export interface SearchResult {
  id: string;
  type: 'customer' | 'menu_item' | 'inventory_item' | 'order' | 'user' | 'report';
  title: string;
  subtitle: string;
  description?: string;
  url: string;
  icon: string;
  metadata?: Record<string, any>;
}

export interface SearchResults {
  results: SearchResult[];
  totalCount: number;
  searchTime: number;
  query: string;
}

// Mock data - in a real app, this would come from APIs
const mockCustomers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', phone: '555-0101', totalSpent: 450.00 },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '555-0102', totalSpent: 320.50 },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', phone: '555-0103', totalSpent: 780.25 },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', phone: '555-0104', totalSpent: 125.75 },
  { id: '5', name: 'Charlie Wilson', email: 'charlie@example.com', phone: '555-0105', totalSpent: 892.00 },
];

const mockMenuItems = [
  { id: '1', name: 'Classic Burger', category: 'Main Course', price: 12.99, available: true, description: 'Beef patty with lettuce, tomato, onion' },
  { id: '2', name: 'French Fries', category: 'Sides', price: 4.99, available: true, description: 'Crispy golden fries' },
  { id: '3', name: 'Caesar Salad', category: 'Salads', price: 8.99, available: true, description: 'Fresh romaine with caesar dressing' },
  { id: '4', name: 'Chicken Wings', category: 'Appetizers', price: 9.99, available: false, description: 'Buffalo style wings' },
  { id: '5', name: 'Chocolate Cake', category: 'Desserts', price: 6.99, available: true, description: 'Rich chocolate layer cake' },
];

const mockInventoryItems = [
  { id: '1', name: 'Ground Beef', sku: 'BEEF-001', category: 'Meat', currentStock: 25, minLevel: 10, unit: 'lbs' },
  { id: '2', name: 'Burger Buns', sku: 'BUN-001', category: 'Bread', currentStock: 8, minLevel: 20, unit: 'packs' },
  { id: '3', name: 'Lettuce', sku: 'VEG-001', category: 'Vegetables', currentStock: 15, minLevel: 5, unit: 'heads' },
  { id: '4', name: 'Tomatoes', sku: 'VEG-002', category: 'Vegetables', currentStock: 30, minLevel: 10, unit: 'lbs' },
  { id: '5', name: 'Coca Cola', sku: 'BEV-001', category: 'Beverages', currentStock: 45, minLevel: 20, unit: 'cases' },
];

const mockOrders = [
  { id: '1234', customerName: 'John Doe', status: 'completed', total: 25.47, date: '2025-01-14T10:30:00Z', items: 3 },
  { id: '1235', customerName: 'Jane Smith', status: 'preparing', total: 18.99, date: '2025-01-14T11:15:00Z', items: 2 },
  { id: '1236', customerName: 'Bob Johnson', status: 'ready', total: 32.50, date: '2025-01-14T11:45:00Z', items: 4 },
  { id: '1237', customerName: 'Alice Brown', status: 'cancelled', total: 15.99, date: '2025-01-14T09:20:00Z', items: 1 },
  { id: '1238', customerName: 'Charlie Wilson', status: 'completed', total: 41.25, date: '2025-01-14T12:00:00Z', items: 5 },
];

// Search functions for each entity type
function searchCustomers(query: string): SearchResult[] {
  const lowercaseQuery = query.toLowerCase();
  return mockCustomers
    .filter(customer => 
      customer.name.toLowerCase().includes(lowercaseQuery) ||
      customer.email.toLowerCase().includes(lowercaseQuery) ||
      customer.phone.includes(query)
    )
    .map(customer => ({
      id: customer.id,
      type: 'customer' as const,
      title: customer.name,
      subtitle: customer.email,
      description: `${customer.phone} • Total spent: $${customer.totalSpent.toFixed(2)}`,
      url: `/customers/${customer.id}`,
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      metadata: { totalSpent: customer.totalSpent, phone: customer.phone }
    }));
}

function searchMenuItems(query: string): SearchResult[] {
  const lowercaseQuery = query.toLowerCase();
  return mockMenuItems
    .filter(item => 
      item.name.toLowerCase().includes(lowercaseQuery) ||
      item.category.toLowerCase().includes(lowercaseQuery) ||
      (item.description && item.description.toLowerCase().includes(lowercaseQuery))
    )
    .map(item => ({
      id: item.id,
      type: 'menu_item' as const,
      title: item.name,
      subtitle: item.category,
      description: `$${item.price.toFixed(2)} • ${item.available ? 'Available' : 'Unavailable'} • ${item.description}`,
      url: `/menu/items/${item.id}`,
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      metadata: { price: item.price, available: item.available }
    }));
}

function searchInventoryItems(query: string): SearchResult[] {
  const lowercaseQuery = query.toLowerCase();
  return mockInventoryItems
    .filter(item => 
      item.name.toLowerCase().includes(lowercaseQuery) ||
      item.sku.toLowerCase().includes(lowercaseQuery) ||
      item.category.toLowerCase().includes(lowercaseQuery)
    )
    .map(item => ({
      id: item.id,
      type: 'inventory_item' as const,
      title: item.name,
      subtitle: `SKU: ${item.sku}`,
      description: `${item.currentStock} ${item.unit} in stock • Min: ${item.minLevel} ${item.unit} • ${item.category}`,
      url: `/inventory/items/${item.id}`,
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      metadata: { 
        currentStock: item.currentStock, 
        minLevel: item.minLevel,
        isLowStock: item.currentStock <= item.minLevel
      }
    }));
}

function searchOrders(query: string): SearchResult[] {
  const lowercaseQuery = query.toLowerCase();
  return mockOrders
    .filter(order => 
      order.id.includes(query) ||
      order.customerName.toLowerCase().includes(lowercaseQuery) ||
      order.status.toLowerCase().includes(lowercaseQuery)
    )
    .map(order => ({
      id: order.id,
      type: 'order' as const,
      title: `Order #${order.id}`,
      subtitle: order.customerName,
      description: `${order.status.charAt(0).toUpperCase() + order.status.slice(1)} • $${order.total.toFixed(2)} • ${order.items} item${order.items > 1 ? 's' : ''}`,
      url: `/orders/${order.id}`,
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      metadata: { status: order.status, total: order.total, items: order.items }
    }));
}

// Quick navigation shortcuts
function searchShortcuts(query: string): SearchResult[] {
  const shortcuts = [
    { keyword: 'pos', title: 'Point of Sale', url: '/pos', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
    { keyword: 'kds', title: 'Kitchen Display', url: '/kds', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { keyword: 'dashboard', title: 'Dashboard', url: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { keyword: 'inventory', title: 'Inventory Management', url: '/inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { keyword: 'customers', title: 'Customer Management', url: '/customers', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { keyword: 'reports', title: 'Reports & Analytics', url: '/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { keyword: 'settings', title: 'Settings', url: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { keyword: 'menu', title: 'Menu Management', url: '/menu', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  ];

  const lowercaseQuery = query.toLowerCase();
  return shortcuts
    .filter(shortcut => 
      shortcut.keyword.includes(lowercaseQuery) ||
      shortcut.title.toLowerCase().includes(lowercaseQuery)
    )
    .map(shortcut => ({
      id: shortcut.keyword,
      type: 'report' as const, // Using 'report' as a generic navigation type
      title: shortcut.title,
      subtitle: 'Quick Navigation',
      description: `Go to ${shortcut.title}`,
      url: shortcut.url,
      icon: shortcut.icon
    }));
}

// Main search function
export function performSearch(query: string): SearchResults {
  const startTime = performance.now();
  
  if (!query || query.trim().length < 2) {
    return {
      results: [],
      totalCount: 0,
      searchTime: 0,
      query: query.trim()
    };
  }

  const trimmedQuery = query.trim();
  
  // Collect results from all search functions
  const customerResults = searchCustomers(trimmedQuery);
  const menuResults = searchMenuItems(trimmedQuery);
  const inventoryResults = searchInventoryItems(trimmedQuery);
  const orderResults = searchOrders(trimmedQuery);
  const shortcutResults = searchShortcuts(trimmedQuery);

  // Combine and prioritize results
  const allResults: SearchResult[] = [
    ...shortcutResults, // Shortcuts first for quick navigation
    ...customerResults,
    ...menuResults,
    ...inventoryResults,
    ...orderResults,
  ];

  // Sort by relevance (exact matches first, then partial matches)
  const sortedResults = allResults.sort((a, b) => {
    const aExact = a.title.toLowerCase() === trimmedQuery.toLowerCase();
    const bExact = b.title.toLowerCase() === trimmedQuery.toLowerCase();
    
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    
    // Then by type priority (shortcuts, customers, menu, inventory, orders)
    const typePriority = { report: 0, customer: 1, menu_item: 2, inventory_item: 3, order: 4, user: 5 };
    const aPriority = typePriority[a.type] || 99;
    const bPriority = typePriority[b.type] || 99;
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // Finally by title alphabetically
    return a.title.localeCompare(b.title);
  });

  const endTime = performance.now();
  const searchTime = Math.round(endTime - startTime);

  return {
    results: sortedResults.slice(0, 50), // Limit to 50 results
    totalCount: allResults.length,
    searchTime,
    query: trimmedQuery
  };
}

// Custom hook for search with debouncing
export function useSearch() {
  const [results, setResults] = useState<SearchResults>({
    results: [],
    totalCount: 0,
    searchTime: 0,
    query: ''
  });
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setResults({
        results: [],
        totalCount: 0,
        searchTime: 0,
        query: query.trim()
      });
      return;
    }

    setLoading(true);
    
    // Simulate API delay for more realistic UX
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const searchResults = performSearch(query);
    setResults(searchResults);
    setLoading(false);
  }, []);

  return { results, loading, search };
}
