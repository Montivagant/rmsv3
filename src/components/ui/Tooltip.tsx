import React, { useState, useCallback } from 'react';
import { cn } from '../../lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
}

export function Tooltip({ content, children, side = 'top', delay = 300 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  
  const showTooltip = useCallback(() => {
    const id = window.setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setTimeoutId(id);
  }, [delay]);
  
  const hideTooltip = useCallback(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  }, [timeoutId]);
  
  const positionClasses = {
    'top': 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    'right': 'left-full ml-2 top-1/2 -translate-y-1/2',
    'bottom': 'top-full mt-2 left-1/2 -translate-x-1/2',
    'left': 'right-full mr-2 top-1/2 -translate-y-1/2',
  };
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {isVisible && (
        <div 
          className={cn(
            "absolute z-50 px-2 py-1.5 text-xs rounded shadow-md",
            "max-w-xs whitespace-normal",
            "bg-text-primary text-text-inverse border border-text-primary",
            "transition-opacity duration-150",
            positionClasses[side]
          )}
          role="tooltip"
          aria-live="polite"
        >
          {content}
          {/* Arrow */}
          <span className={cn(
            "absolute w-2 h-2 rotate-45",
            "bg-text-primary",
            {
              "bottom-[-4px] left-1/2 -translate-x-1/2": side === 'top',
              "top-1/2 -translate-y-1/2 left-[-4px]": side === 'right',
              "top-[-4px] left-1/2 -translate-x-1/2": side === 'bottom',
              "top-1/2 -translate-y-1/2 right-[-4px]": side === 'left',
            }
          )}/>
        </div>
      )}
      {children}
    </div>
  );
}