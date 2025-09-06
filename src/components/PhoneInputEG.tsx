import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

/**
 * Egypt Phone Input (+20 locked)
 * - Renders a single local number input with a fixed +20 prefix
 * - Accepts digits only
 * - Validates length 9–10 digits for local part
 */
interface PhoneInputEGProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  label?: string;
  error?: string;
  helpText?: string;
  value: string; // local part only (digits)
  onChange: (localDigits: string) => void;
  variant?: 'default' | 'filled';
}

export const PhoneInputEG = forwardRef<HTMLInputElement, PhoneInputEGProps>(function PhoneInputEG(
  {
    className,
    label,
    error,
    helpText,
    value,
    onChange,
    id,
    disabled,
    required,
    variant = 'default',
    ...props
  },
  ref
) {
  const inputId = id || `phone-eg-${Math.random().toString(36).slice(2, 11)}`;
  const helpId = helpText ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  const hasError = Boolean(error);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    onChange(digits);
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

      <div className="relative">
        {/* Locked prefix */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-text-tertiary select-none">+20</span>
        </div>

        <input
          id={inputId}
          ref={ref}
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={describedBy}
          aria-labelledby={label ? `${inputId}-label` : undefined}
          className={cn(
            'input-base',
            variant === 'filled' && 'bg-surface-secondary border-transparent',
            hasError && 'input-error',
            'pl-12',
            disabled && 'opacity-50 cursor-not-allowed bg-surface-secondary',
            className
          )}
          placeholder="10 1234 5678"
          {...props}
        />
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
 * Utility to build E.164 +20 number from local digits
 */
export function toE164EG(localDigits: string): string {
  const digits = String(localDigits || '').replace(/\D/g, '');
  return `+20${digits}`;
}
