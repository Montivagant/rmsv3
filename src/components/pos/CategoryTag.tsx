/**
 * Category Tag Component for POS Menu Cards
 * Displays category tags with different styles based on category type
 */

import { cn } from '../../lib/utils';

export interface CategoryTagProps {
  category: string;
  className?: string;
}

// Category type mapping with styles and icons
const CATEGORY_STYLES = {
  // Main meal categories
  'appetizers': {
    variant: 'appetizer',
    icon: '🥗',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-700 dark:text-green-300',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  'main courses': {
    variant: 'main',
    icon: '🍽️',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  'mains': {
    variant: 'main',
    icon: '🍽️',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  'entrees': {
    variant: 'main',
    icon: '🍽️',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  'sides': {
    variant: 'side',
    icon: '🍠',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    textColor: 'text-orange-700 dark:text-orange-300',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  'side dishes': {
    variant: 'side',
    icon: '🍠',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    textColor: 'text-orange-700 dark:text-orange-300',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  'beverages': {
    variant: 'beverage',
    icon: '🥤',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/20',
    textColor: 'text-cyan-700 dark:text-cyan-300',
    borderColor: 'border-cyan-200 dark:border-cyan-800'
  },
  'drinks': {
    variant: 'beverage',
    icon: '🥤',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/20',
    textColor: 'text-cyan-700 dark:text-cyan-300',
    borderColor: 'border-cyan-200 dark:border-cyan-800'
  },
  'desserts': {
    variant: 'dessert',
    icon: '🍰',
    bgColor: 'bg-pink-100 dark:bg-pink-900/20',
    textColor: 'text-pink-700 dark:text-pink-300',
    borderColor: 'border-pink-200 dark:border-pink-800'
  },
  'sweets': {
    variant: 'dessert',
    icon: '🍰',
    bgColor: 'bg-pink-100 dark:bg-pink-900/20',
    textColor: 'text-pink-700 dark:text-pink-300',
    borderColor: 'border-pink-200 dark:border-pink-800'
  },
  // Additional categories
  'salads': {
    variant: 'salad',
    icon: '🥙',
    bgColor: 'bg-lime-100 dark:bg-lime-900/20',
    textColor: 'text-lime-700 dark:text-lime-300',
    borderColor: 'border-lime-200 dark:border-lime-800'
  },
  'soups': {
    variant: 'soup',
    icon: '🍲',
    bgColor: 'bg-amber-100 dark:bg-amber-900/20',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800'
  },
  'pizza': {
    variant: 'pizza',
    icon: '🍕',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    textColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-red-200 dark:border-red-800'
  },
  'pasta': {
    variant: 'pasta',
    icon: '🍝',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    borderColor: 'border-yellow-200 dark:border-yellow-800'
  },
  'sandwiches': {
    variant: 'sandwich',
    icon: '🥪',
    bgColor: 'bg-stone-100 dark:bg-stone-900/20',
    textColor: 'text-stone-700 dark:text-stone-300',
    borderColor: 'border-stone-200 dark:border-stone-800'
  },
  'burgers': {
    variant: 'burger',
    icon: '🍔',
    bgColor: 'bg-rose-100 dark:bg-rose-900/20',
    textColor: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-200 dark:border-rose-800'
  }
} as const;

// Default style for unknown categories
const DEFAULT_STYLE = {
  variant: 'default',
  icon: '🏷️',
  bgColor: 'bg-gray-100 dark:bg-gray-900/20',
  textColor: 'text-gray-700 dark:text-gray-300',
  borderColor: 'border-gray-200 dark:border-gray-800'
};

function getCategoryStyle(category: string) {
  const normalizedCategory = category.toLowerCase().trim();
  return CATEGORY_STYLES[normalizedCategory as keyof typeof CATEGORY_STYLES] || DEFAULT_STYLE;
}

export function CategoryTag({ category, className }: CategoryTagProps) {
  const style = getCategoryStyle(category);
  
  return (
    <span 
      className={cn(
        // Base styles
        "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium",
        "rounded-md border backdrop-blur-sm",
        "transition-all duration-200",
        // Dynamic colors
        style.bgColor,
        style.textColor, 
        style.borderColor,
        // Custom className
        className
      )}
      title={`Category: ${category}`}
    >
      <span className="text-[10px]" role="img" aria-hidden="true">
        {style.icon}
      </span>
      <span className="truncate max-w-[60px]">
        {category}
      </span>
    </span>
  );
}

// Export the category styles for external usage
export { CATEGORY_STYLES, DEFAULT_STYLE, getCategoryStyle };
