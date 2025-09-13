import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helpText?: string;
  options?: SelectOption[];
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onValueChange?: (value: string) => void;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    className, 
    label, 
    error, 
    helpText, 
    options, 
    placeholder, 
    id, 
    disabled,
    required,
    onChange,
    onValueChange,
    children,
    ...props 
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).slice(2, 11)}`;
    const helpId = helpText ? `${selectId}-help` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;
    const describedBy = errorId || helpId || undefined;
    const hasError = Boolean(error);
    
    return (
      <div className="space-y-field">
        {label && (
          <label
            htmlFor={selectId}
            className="field-label"
          >
            {label}
            {required && (
              <span className="text-error ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}
        
        <div className="relative">
          <select
            id={selectId}
            className={cn(
              'input-base appearance-none pr-10',
              hasError && 'input-error',
              disabled && 'opacity-50 cursor-not-allowed bg-surface-secondary',
              className
            )}
            ref={ref}
            disabled={disabled}
            required={required}
            aria-required={required ? 'true' : undefined}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={describedBy}
            aria-labelledby={label ? `${selectId}-label` : undefined}
            aria-label={label ? label : undefined}
            onChange={(e) => {
              onChange?.(e);
              onValueChange?.(e.target.value);
            }}
            onClick={(e) => {
              const target = e.target as HTMLElement | null;
              if (target && target.tagName === 'OPTION') {
                const opt = target as HTMLOptionElement;
                onValueChange?.(opt.value);
              }
            }}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options ? (
              // Render from options prop
              options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  onClick={() => onValueChange?.(option.value)}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))
            ) : (
              // Render children
              children
            )}
          </select>
          
          {/* Dropdown arrow */}
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg
              className="w-4 h-4 text-text-tertiary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        
        {helpText && !error && (
          <p id={helpId} className="field-help">
            {helpText}
          </p>
        )}
        
        {error && (
          <p id={errorId} className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
export type { SelectOption, SelectProps };
