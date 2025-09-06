import React, { forwardRef } from 'react';

type NumberFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> & {
  id?: string;
  label?: string;
  helpText?: string;
  error?: string;
  value: number | string;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { id, label, helpText, error, value, onChange, className, min, max, step, required, disabled, ...rest },
  ref
) {
  const inputId = id || `num-${Math.random().toString(36).slice(2, 11)}`;
  const helpId = helpText ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  const hasError = Boolean(error);

  return (
    <div className="space-y-field">
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
          {required && <span className="text-error ml-1" aria-label="required">*</span>}
        </label>
      )}

      <input
        ref={ref}
        id={inputId}
        type="number"
        className={['input-base', hasError ? 'input-error' : '', disabled ? 'opacity-50 cursor-not-allowed bg-surface-secondary' : '', className]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={describedBy}
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        required={required}
        disabled={disabled}
        {...rest}
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
});

export default NumberField;
