import React from 'react';
import { cn } from '../../lib/utils';

interface QtyStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function QtyStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  disabled = false,
  size = 'md',
  className,
}: QtyStepperProps) {
  const handleDecrement = () => {
    const newValue = Math.max(min, value - 1);
    onChange(newValue);
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + 1);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty input temporarily
    if (inputValue === '') {
      onChange(min);
      return;
    }

    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      const newValue = Math.max(min, Math.min(max, parsed));
      onChange(newValue);
    }
  };

  const sizeClasses = {
    sm: {
      button: 'w-8 h-8 text-sm',
      input: 'w-12 h-8 text-sm',
    },
    md: {
      button: 'w-12 h-12 text-base',
      input: 'w-16 h-12 text-base',
    },
    lg: {
      button: 'w-14 h-14 text-lg',
      input: 'w-20 h-14 text-lg',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-1 rounded-lg",
        "bg-surface border border-primary",
        className
      )}
      role="group"
      aria-label="Quantity stepper"
    >
      {/* Decrement Button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className={cn(
          // Size
          sizes.button,
          // Base styles
          "rounded-l-lg font-medium",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-brand focus:ring-inset",
          // Enabled state
          !disabled && value > min && [
            "text-primary bg-surface",
            "hover:bg-surface-secondary hover:text-primary",
            "active:scale-95",
          ],
          // Disabled state
          (disabled || value <= min) && [
            "text-tertiary bg-surface-secondary",
            "cursor-not-allowed opacity-50",
          ]
        )}
        aria-label="Decrease quantity"
        aria-disabled={disabled || value <= min}
      >
        <svg
          className="w-5 h-5 mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 12H4"
          />
        </svg>
      </button>

      {/* Input Field */}
      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        min={min}
        max={max}
        className={cn(
          // Size
          sizes.input,
          // Base styles
          "text-center font-medium",
          "bg-surface text-primary",
          "border-x border-primary",
          "focus:outline-none focus:ring-2 focus:ring-brand focus:ring-inset",
          // Remove number input arrows
          "[appearance:textfield]",
          "[&::-webkit-outer-spin-button]:appearance-none",
          "[&::-webkit-inner-spin-button]:appearance-none",
          // Disabled state
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Quantity"
      />

      {/* Increment Button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className={cn(
          // Size
          sizes.button,
          // Base styles
          "rounded-r-lg font-medium",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-brand focus:ring-inset",
          // Enabled state
          !disabled && value < max && [
            "text-primary bg-surface",
            "hover:bg-surface-secondary hover:text-primary",
            "active:scale-95",
          ],
          // Disabled state
          (disabled || value >= max) && [
            "text-tertiary bg-surface-secondary",
            "cursor-not-allowed opacity-50",
          ]
        )}
        aria-label="Increase quantity"
        aria-disabled={disabled || value >= max}
      >
        <svg
          className="w-5 h-5 mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>
    </div>
  );
}
