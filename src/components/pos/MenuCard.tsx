import { cn, formatCurrency, truncate } from '../../lib/utils';
import { CategoryTag } from './CategoryTag';

interface MenuCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  onAddToCart: () => void;
  disabled?: boolean;
}

export function MenuCard({
  id,
  name,
  description,
  price,
  category,
  image,
  onAddToCart,
  disabled = false,
}: MenuCardProps) {
  return (
    <article
      className={cn(
        // Base styles
        "bg-surface rounded-lg border border-border",
        "flex flex-col h-full",
        "transition-all duration-200",
        // Hover state
        !disabled && "hover:shadow-lg hover:border-primary/20",
        // Disabled state
        disabled && "opacity-50 cursor-not-allowed"
      )}
      aria-labelledby={`menu-item-${id}`}
    >
      {/* Image Section - Reduced aspect ratio for more compact cards */}
      <div className="relative aspect-[3/2] bg-muted rounded-t-lg overflow-hidden">
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
              className="w-12 h-12 text-muted-foreground"
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
        
        {/* Category Tag with Type-Specific Styling */}
        <div className="absolute top-2 right-2">
          <CategoryTag category={category} />
        </div>
      </div>

      {/* Content Section - Reduced padding and font sizes for compact design */}
      <div className="flex-1 flex flex-col p-3 gap-2">
        {/* Title and Description */}
        <div className="flex-1">
          <h3 
            id={`menu-item-${id}`}
            className="font-semibold text-foreground text-base leading-tight mb-1"
          >
            {truncate(name, 45)}
          </h3>
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Price and Action - Compact sizing */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-bold text-primary">
            {formatCurrency(price)}
          </span>
          
          <button
            onClick={onAddToCart}
            disabled={disabled}
            className={cn(
              // Base styles - Reduced padding and min sizes
              "px-3 py-1.5 min-h-[36px] min-w-[80px]",
              "rounded-lg font-medium text-sm",
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
      </div>
    </article>
  );
}
