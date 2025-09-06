import React from 'react';
import { cn } from '../../lib/utils';

interface FilterTabsProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  className?: string;
}

export function FilterTabs({ 
  categories, 
  selectedCategory, 
  onCategoryChange,
  className 
}: FilterTabsProps) {
  return (
    <div 
      className={cn(
        "flex gap-2 overflow-x-auto scrollbar-thin",
        "pb-2 snap-x snap-mandatory",
        className
      )}
      role="tablist"
      aria-label="Filter by category"
    >
      {categories.map((category) => (
        <button
          key={category}
          role="tab"
          aria-selected={selectedCategory === category}
          aria-controls={`panel-${category.toLowerCase().replace(/\s+/g, '-')}`}
          onClick={() => onCategoryChange(category)}
          className={cn(
            // Base styles
            "px-6 py-3 rounded-lg font-medium whitespace-nowrap snap-start",
            "min-w-[80px] min-h-[48px]", // Touch target size (48dp)
            "transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2",
            // Selected state
            selectedCategory === category ? 
              "bg-brand text-text-inverse shadow-md" :
              "bg-surface border border-primary hover:bg-surface-secondary text-text-secondary hover:text-text-primary"
          )}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
