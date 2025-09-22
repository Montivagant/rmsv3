/**
 * Menu List Component for POS
 * Displays menu items in a compact list format as an alternative to cards
 */

import { cn, formatCurrency, truncate } from '../../lib/utils';
import { CategoryTag } from './CategoryTag';

interface MenuListItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  onAddToCart: () => void;
  disabled?: boolean;
}

interface MenuListProps {
  items: MenuListItem[];
  className?: string;
}

export function MenuList({ items, className }: MenuListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No items found</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {items.map(item => (
        <MenuListRow key={item.id} {...item} />
      ))}
    </div>
  );
}

function MenuListRow({
  id,
  name,
  description,
  price,
  category,
  image,
  onAddToCart,
  disabled = false,
}: MenuListItem) {
  return (
    <article
      className={cn(
        // Base styles
        "bg-surface rounded-lg border border-border",
        "flex items-center gap-4 p-3",
        "transition-all duration-200",
        // Hover state
        !disabled && "hover:shadow-md hover:border-primary/20",
        // Disabled state
        disabled && "opacity-50"
      )}
      aria-labelledby={`menu-item-list-${id}`}
    >
      {/* Image Section */}
      <div className="flex-shrink-0 w-16 h-16 bg-muted rounded-lg overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          {/* Title and Category */}
          <div className="flex items-center gap-2 min-w-0">
            <h3 
              id={`menu-item-list-${id}`}
              className="font-semibold text-foreground text-sm leading-tight truncate"
            >
              {truncate(name, 40)}
            </h3>
            <CategoryTag category={category} className="flex-shrink-0" />
          </div>

          {/* Price */}
          <span className="flex-shrink-0 font-bold text-primary text-lg">
            {formatCurrency(price)}
          </span>
        </div>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
            {description}
          </p>
        )}
      </div>

      {/* Action Button */}
      <div className="flex-shrink-0">
        <button
          onClick={onAddToCart}
          disabled={disabled}
          className={cn(
            // Base styles
            "px-3 py-1.5 min-h-[32px] min-w-[70px]",
            "rounded-lg font-medium text-xs",
            "transition-all duration-200",
            // Focus styles
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            // Enabled state
            !disabled && [
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              "active:scale-95",
            ],
            // Disabled state
            disabled && [
              "bg-muted text-muted-foreground",
              "cursor-not-allowed",
            ]
          )}
          aria-label={`Add ${name} to cart`}
        >
          Add
        </button>
      </div>
    </article>
  );
}

// Export the individual row component for flexibility
export { MenuListRow };
