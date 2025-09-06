import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    label, 
    error, 
    helpText, 
    resize = 'vertical',
    id, 
    disabled,
    required,
    ...props 
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 11)}`;
    const helpId = helpText ? `${textareaId}-help` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;
    const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
    const hasError = Boolean(error);
    
    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };
    
    return (
      <div className="space-y-field">
        {label && (
          <label
            htmlFor={textareaId}
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
        
        <textarea
          id={textareaId}
          className={cn(
            'input-base min-h-[80px]',
            resizeClasses[resize],
            hasError && 'input-error',
            disabled && 'opacity-50 cursor-not-allowed bg-surface-secondary',
            className
          )}
          ref={ref}
          disabled={disabled}
          required={required}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={describedBy}
          {...props}
        />
        
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

Textarea.displayName = 'Textarea';

export { Textarea };
export type { TextareaProps };
