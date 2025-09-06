import { forwardRef } from 'react';
import type { LabelHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        className={cn('field-label', className)}
        ref={ref}
        {...props}
      >
        {children}
        {required && (
          <span className="text-error ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
    );
  }
);

Label.displayName = 'Label';

export { Label };
