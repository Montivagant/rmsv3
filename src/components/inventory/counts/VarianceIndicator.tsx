import { cn } from '../../../lib/utils';
import { CountUtils } from '../../../inventory/counts/types';

interface VarianceIndicatorProps {
  varianceQty: number;
  varianceValue: number;
  variancePercentage: number;
  unit?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VarianceIndicator({ 
  varianceQty, 
  varianceValue, 
  variancePercentage, 
  unit = '',
  showValue = true,
  size = 'md',
  className 
}: VarianceIndicatorProps) {
  const severity = CountUtils.getVarianceSeverity(variancePercentage);
  const isPositive = varianceQty > 0;
  const isZero = varianceQty === 0;

  // Design token-based styling
  const severityClasses = {
    low: 'text-success bg-success/10 border-success/20',
    medium: 'text-warning bg-warning/10 border-warning/20', 
    high: 'text-error bg-error/10 border-error/20'
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  if (isZero) {
    return (
      <span className={cn(
        'inline-flex items-center rounded-md border font-medium',
        'text-text-muted bg-surface-secondary border-border-secondary',
        sizeClasses[size],
        className
      )}>
        No variance
      </span>
    );
  }

  const formattedQty = CountUtils.formatVariance(varianceQty, true);
  const formattedValue = CountUtils.formatVarianceValue(varianceValue);

  return (
    <div role="generic" data-testid="variance-indicator" className={cn(
      'inline-flex items-center gap-1 rounded-md border font-medium',
      severityClasses[severity],
      sizeClasses[size],
      className
    )}>
      {/* Variance direction icon */}
      <span role="presentation" className="text-current">
        {isPositive ? '↑' : '↓'}
      </span>
      
      {/* Quantity variance */}
      <span role="presentation">
        {formattedQty} {unit}
      </span>
      
      {/* Value variance (if requested) */}
      {showValue && (
        <>
          <span role="presentation" className="text-text-muted">•</span>
          <span role="presentation" className="font-semibold">
            {formattedValue}
          </span>
        </>
      )}
      
      {/* Percentage */}
      <span role="presentation" className="text-xs opacity-80">
        ({CountUtils.formatVariance(variancePercentage, true)}%)
      </span>
    </div>
  );
}
