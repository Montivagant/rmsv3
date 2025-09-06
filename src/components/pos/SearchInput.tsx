import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  showShortcut?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, showShortcut = true, ...props }, ref) => {
    const hasValue = props.value && String(props.value).length > 0;

    return (
      <div className="relative w-full">
        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            className="w-5 h-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input Field */}
        <input
          ref={ref}
          type="search"
          className={cn(
            // Base styles
            "w-full min-h-[48px] pl-10 pr-24",
            "rounded-lg border border-border",
            "bg-background text-foreground",
            "placeholder:text-muted-foreground",
            // Focus styles
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
            // Hover
            "hover:border-muted-foreground/50",
            // Transition
            "transition-all duration-200",
            className
          )}
          aria-label="Search menu items"
          {...props}
        />

        {/* Clear button */}
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              "absolute right-12 top-1/2 -translate-y-1/2",
              "p-1 rounded-md",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-accent",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              "transition-colors duration-200"
            )}
            aria-label="Clear search"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}

        {/* Keyboard shortcut hint */}
        {showShortcut && !hasValue && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <kbd className={cn(
              "px-2 py-1",
              "text-xs font-mono",
              "bg-muted text-muted-foreground",
              "border border-border rounded"
            )}>
              /
            </kbd>
          </div>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
