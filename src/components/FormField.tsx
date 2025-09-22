import { forwardRef, type ReactNode } from 'react';
import { cn } from '../lib/utils';

interface FormFieldProps {
  children: ReactNode;
  className?: string;
  error?: string | undefined;
  helpText?: string | undefined;
  required?: boolean;
}

const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ children, className, error, helpText, ...props }, ref) => {
    return (
      <div
        className={cn('space-y-field', className)}
        ref={ref}
        {...props}
      >
        {children}
        {helpText && !error && (
          <p className="field-help">
            {helpText}
          </p>
        )}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

export { FormField };
