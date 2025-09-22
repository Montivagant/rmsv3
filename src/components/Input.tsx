import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | undefined;
  helpText?: string | undefined;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  variant?: 'default' | 'filled';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    label, 
    error, 
    helpText,
    leftIcon,
    rightIcon,
    variant = 'default',
    id, 
    disabled,
    required,
    ...props 
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 11)}`;
    const helpId = helpText ? `${inputId}-help` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = errorId || helpId || undefined;
    const hasError = Boolean(error);
    
    return (
      <div className="space-y-field">
        {label && (
          <label
            id={`${inputId}-label`}
            htmlFor={inputId}
            className={cn('field-label')}
          >
            <span>{label}</span>
            {required && (
              <span className="text-error ml-1">*</span>
            )}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-text-tertiary" aria-hidden="true">
                {leftIcon}
              </span>
            </div>
          )}
          
          <input
            id={inputId}
            className={cn(
              'input-base',
              variant === 'filled' && 'bg-surface-secondary border-transparent',
              hasError && 'input-error',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              disabled && 'opacity-50 cursor-not-allowed bg-surface-secondary',
              className
            )}
            ref={ref}
            disabled={disabled}
            required={required}
            aria-required={required ? 'true' : undefined}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={describedBy}
            aria-labelledby={label ? `${inputId}-label` : undefined}
            aria-label={label ? label : undefined}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';

export { Input };
export type { InputProps };
