import { forwardRef, useId, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helpText?: string;
  leftIcon?: ReactNode;
  showLabel?: string;
  hideLabel?: string;
  variant?: 'default' | 'filled';
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      className,
      label,
      error,
      helpText,
      leftIcon,
      showLabel = 'Show',
      hideLabel = 'Hide',
      variant = 'default',
      id,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const reactId = useId();
    const inputId = id || `password-${reactId}`;
    const helpId = helpText ? `${inputId}-help` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
    const hasError = Boolean(error);
    const [visible, setVisible] = useState(false);

    return (
      <div className="space-y-field">
        {label && (
          <label
            id={`${inputId}-label`}
            htmlFor={inputId}
            className={cn(
              'field-label',
              required && 'after:content-["*"] after:ml-1 after:text-error'
            )}
          >
            {label}
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
              disabled && 'opacity-50 cursor-not-allowed bg-surface-secondary',
              'pr-12', // space for toggle
              className
            )}
            ref={ref}
            type={visible ? 'text' : 'password'}
            disabled={disabled}
            required={required}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={describedBy}
            aria-labelledby={label ? `${inputId}-label` : undefined}
            {...props}
          />

          <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center rounded-md h-8 w-8',
                'text-text-tertiary hover:text-text-primary',
                'focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2'
              )}
              aria-pressed={visible}
              aria-label={visible ? hideLabel : showLabel}
              tabIndex={-1}
              onClick={() => setVisible((v) => !v)}
            >
              {visible ? (
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 5c-7.633 0-10 7-10 7s2.367 7 10 7 10-7 10-7-2.367-7-10-7zm0 12c-2.757 0-5-2.244-5-5s2.243-5 5-5 5 2.244 5 5-2.243 5-5 5zm0-8a3 3 0 100 6 3 3 0 000-6z" />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M2.293 2.293l19.414 19.414-1.414 1.414-3.26-3.26C14.921 21.235 13.54 22 12 22 4.367 22 2 15 2 15s.791-2.339 3.5-4.734L.879 3.707 2.293 2.293zM12 5c1.54 0 2.921.765 4.033 2.139l-1.457 1.457A4.996 4.996 0 0012 7C9.243 7 7 9.244 7 12c0 .65.132 1.268.371 1.828l-1.55 1.55C3.327 13.22 2.37 11.29 2 10.999 2 10.999 4.367 5 12 5z" />
                </svg>
              )}
            </button>
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

PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
export type { PasswordInputProps };
