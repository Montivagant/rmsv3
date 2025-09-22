import { cn } from '../../lib/utils';

interface KdsToolbarProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  density: 'compact' | 'comfortable';
  onDensityChange: (density: 'compact' | 'comfortable') => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  orderCount?: number;
  overdueCount?: number;
  className?: string;
}

export function KdsToolbar({
  viewMode,
  onViewModeChange,
  density,
  onDensityChange,
  isFullscreen,
  onFullscreenToggle,
  orderCount = 0,
  overdueCount = 0,
  className,
}: KdsToolbarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'px-4 py-3',
        'bg-surface border-b border-border',
        className
      )}
    >
      {/* Left side - Title and count */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          Kitchen Display
        </h1>
        {orderCount > 0 && (
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            {orderCount} active {orderCount === 1 ? 'order' : 'orders'}
          </span>
        )}
        {overdueCount > 0 && (
          <span className="px-3 py-1 rounded-full bg-error/10 text-error text-sm font-medium">
            {overdueCount} overdue
          </span>
        )}
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <div
          className="inline-flex rounded-lg border border-border bg-background p-1"
          role="group"
          aria-label="View mode"
        >
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
              viewMode === 'grid' ? [
                'bg-primary text-primary-foreground',
                'shadow-sm',
              ] : [
                'text-muted-foreground',
                'hover:text-foreground hover:bg-accent',
              ]
            )}
            aria-pressed={viewMode === 'grid'}
            aria-label="Grid view"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
              viewMode === 'list' ? [
                'bg-primary text-primary-foreground',
                'shadow-sm',
              ] : [
                'text-muted-foreground',
                'hover:text-foreground hover:bg-accent',
              ]
            )}
            aria-pressed={viewMode === 'list'}
            aria-label="List view"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Density Toggle */}
        <div
          className="inline-flex rounded-lg border border-border bg-background p-1"
          role="group"
          aria-label="Display density"
        >
          <button
            onClick={() => onDensityChange('compact')}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
              density === 'compact' ? [
                'bg-primary text-primary-foreground',
                'shadow-sm',
              ] : [
                'text-muted-foreground',
                'hover:text-foreground hover:bg-accent',
              ]
            )}
            aria-pressed={density === 'compact'}
            aria-label="Compact density"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 8h16M4 16h16" />
            </svg>
          </button>
          <button
            onClick={() => onDensityChange('comfortable')}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset',
              density === 'comfortable' ? [
                'bg-primary text-primary-foreground',
                'shadow-sm',
              ] : [
                'text-muted-foreground',
                'hover:text-foreground hover:bg-accent',
              ]
            )}
            aria-pressed={density === 'comfortable'}
            aria-label="Comfortable density"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Fullscreen Toggle */}
        <button
          onClick={onFullscreenToggle}
          className={cn(
            'p-2 rounded-lg border border-border',
            'bg-background text-foreground',
            'hover:bg-accent hover:text-accent-foreground',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'transition-all duration-200'
          )}
          aria-pressed={isFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
