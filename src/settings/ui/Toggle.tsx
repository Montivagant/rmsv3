import React from 'react';
import { cn } from '../../lib/utils';

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
};

export default function Toggle({
  checked,
  onChange,
  disabled,
  label,
  id,
  size = 'md',
  className,
  ariaLabel,
}: ToggleProps) {
  const controlId = id || `toggle-${Math.random().toString(36).slice(2, 11)}`;
  const dimensions = size === 'sm'
    ? { track: 'h-5 w-9', knob: 'h-4 w-4 translate-x-0.5', knobChecked: 'translate-x-[1.375rem]' }
    : { track: 'h-6 w-11', knob: 'h-5 w-5 translate-x-1', knobChecked: 'translate-x-[1.625rem]' };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <button
        id={controlId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || (!label ? 'Toggle' : undefined)}
        className={cn(
          'relative inline-flex flex-shrink-0 cursor-pointer rounded-full border transition-colors focus-ring',
          'border-primary',
          checked ? 'bg-brand text-inverse' : 'bg-surface',
          disabled && 'opacity-50 cursor-not-allowed',
          dimensions.track
        )}
        onClick={() => !disabled && onChange(!checked)}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow',
            'transition-transform duration-200 ease-in-out',
            dimensions.knob,
            checked && dimensions.knobChecked
          )}
        />
      </button>
      {label && (
        <label htmlFor={controlId} className="text-body text-primary cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  );
}
