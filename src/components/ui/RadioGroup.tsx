import React, { createContext, useContext } from 'react';
import { cn } from '../../lib/utils';

interface RadioGroupContextType {
  value: string;
  onChange: (value: string) => void;
  name: string;
}

const RadioGroupContext = createContext<RadioGroupContextType | null>(null);

interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
  className?: string;
  children: React.ReactNode;
}

export function RadioGroup({ value, onChange, name, className, children }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onChange, name }}>
      <div className={cn('space-y-3', className)}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioOptionProps {
  value: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function RadioOption({ value, className, children, disabled = false }: RadioOptionProps) {
  const context = useContext(RadioGroupContext);
  
  if (!context) {
    throw new Error('RadioOption must be used within a RadioGroup');
  }

  const { value: selectedValue, onChange, name } = context;
  const isSelected = selectedValue === value;

  return (
    <label className={cn(
      'flex items-start space-x-3 cursor-pointer',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}>
      <div className="relative mt-1">
        <input
          type="radio"
          name={name}
          value={value}
          checked={isSelected}
          onChange={() => !disabled && onChange(value)}
          disabled={disabled}
          className="sr-only"
        />
        <div className={cn(
          'flex items-center justify-center w-4 h-4 border-2 rounded-full transition-all',
          isSelected
            ? 'border-brand bg-brand'
            : 'border-border bg-background hover:border-brand/50',
          disabled && 'border-border bg-surface-secondary'
        )}>
          {isSelected && (
            <div className="w-2 h-2 rounded-full bg-text-inverse" />
          )}
        </div>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </label>
  );
}

interface RadioOptionContentProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
}

export function RadioOptionContent({ title, description, badge }: RadioOptionContentProps) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="font-medium text-text-primary">{title}</div>
        {badge}
      </div>
      {description && (
        <div className="text-sm text-text-muted mt-1">{description}</div>
      )}
    </div>
  );
}
