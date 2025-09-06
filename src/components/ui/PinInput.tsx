import React, { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../Button';

interface PinInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  label?: string;
  error?: string;
  helpText?: string;
  value: string;
  onChange: (pin: string) => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
  maxLength?: number;
  variant?: 'default' | 'filled';
}

export const PinInput = forwardRef<HTMLInputElement, PinInputProps>(function PinInput(
  {
    className,
    label,
    error,
    helpText,
    value,
    onChange,
    onGenerate,
    isGenerating = false,
    maxLength = 6,
    id,
    disabled,
    required,
    variant = 'default',
    ...props
  },
  ref
) {
  const inputId = id || `pin-${Math.random().toString(36).slice(2, 11)}`;
  const helpId = helpText ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  const hasError = Boolean(error);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, maxLength);
    onChange(digits);
  };

  const handleGenerate = () => {
    if (onGenerate && !isGenerating && !disabled) {
      onGenerate();
    }
  };

  return (
    <div className="space-y-field">
      {label && (
        <label id={`${inputId}-label`} htmlFor={inputId} className="field-label">
          {label}
          {required && (
            <span className="text-error ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <input
            id={inputId}
            ref={ref}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={value}
            onChange={handleChange}
            disabled={disabled}
            required={required}
            maxLength={maxLength}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={describedBy}
            aria-labelledby={label ? `${inputId}-label` : undefined}
            className={cn(
              'input-base',
              variant === 'filled' && 'bg-surface-secondary border-transparent',
              hasError && 'input-error',
              disabled && 'opacity-50 cursor-not-allowed bg-surface-secondary',
              'font-mono tracking-wider text-center',
              className
            )}
            placeholder={maxLength === 4 ? '1234' : '123456'}
            {...props}
          />
        </div>

        {onGenerate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={disabled || isGenerating}
            className="flex-shrink-0"
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
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
});

/**
 * Generate a cryptographically secure PIN
 */
export function generateSecurePin(length: number = 4): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, num => (num % 10).toString()).join('');
  }
  
  // Fallback for environments without crypto.getRandomValues
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

/**
 * Validate PIN format
 */
export function validatePin(pin: string, minLength: number = 4, maxLength: number = 6): { isValid: boolean; error?: string } {
  if (!pin) {
    return { isValid: false, error: 'PIN is required' };
  }
  
  if (!/^\d+$/.test(pin)) {
    return { isValid: false, error: 'PIN must contain only digits' };
  }
  
  if (pin.length < minLength) {
    return { isValid: false, error: `PIN must be at least ${minLength} digits` };
  }
  
  if (pin.length > maxLength) {
    return { isValid: false, error: `PIN cannot exceed ${maxLength} digits` };
  }
  
  return { isValid: true };
}
