/**
 * View Toggle Component for POS
 * Allows switching between card and list view modes
 */

import { cn } from '../../lib/utils';

export type ViewMode = 'card' | 'list';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ currentView, onViewChange, className }: ViewToggleProps) {
  return (
    <div 
      className={cn(
        "inline-flex items-center bg-muted rounded-lg p-1",
        "border border-border",
        className
      )}
      role="tablist"
      aria-label="View mode toggle"
    >
      {/* Card View Button */}
      <button
        onClick={() => onViewChange('card')}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md",
          "text-sm font-medium transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
          currentView === 'card' && [
            "bg-background shadow-sm",
            "text-foreground",
            "border border-border"
          ],
          currentView !== 'card' && [
            "text-muted-foreground",
            "hover:text-foreground hover:bg-background/50"
          ]
        )}
        role="tab"
        aria-selected={currentView === 'card'}
        aria-label="Card view"
        title="Card view"
      >
        {/* Card View Icon */}
        <svg 
          className="w-4 h-4" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" 
          />
        </svg>
        <span className="hidden sm:inline">Cards</span>
      </button>

      {/* List View Button */}
      <button
        onClick={() => onViewChange('list')}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md",
          "text-sm font-medium transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
          currentView === 'list' && [
            "bg-background shadow-sm",
            "text-foreground",
            "border border-border"
          ],
          currentView !== 'list' && [
            "text-muted-foreground",
            "hover:text-foreground hover:bg-background/50"
          ]
        )}
        role="tab"
        aria-selected={currentView === 'list'}
        aria-label="List view"
        title="List view"
      >
        {/* List View Icon */}
        <svg 
          className="w-4 h-4" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M4 6h16M4 10h16M4 14h16M4 18h16" 
          />
        </svg>
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}
