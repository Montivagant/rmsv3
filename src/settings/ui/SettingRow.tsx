import React from 'react';

type SettingRowProps = {
  label?: string;
  htmlFor?: string;
  description?: string | React.ReactNode;
  helpText?: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  alignTop?: boolean;
};

export default function SettingRow({
  label,
  htmlFor,
  description,
  helpText,
  children,
  className,
  alignTop = false,
}: SettingRowProps) {
  return (
    <div
      className={[
        'grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6',
        alignTop ? 'items-start' : 'items-center',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="md:col-span-4">
        {label ? (
          <label
            htmlFor={htmlFor}
            className="block text-body font-medium text-primary"
          >
            {label}
          </label>
        ) : null}
        {description ? (
          typeof description === 'string' ? (
            <p className="text-body-sm text-tertiary mt-1">{description}</p>
          ) : (
            <div className="mt-1">{description}</div>
          )
        ) : null}
      </div>
      <div className="md:col-span-8">
        <div className="space-y-1">
          {children}
          {helpText ? (
            typeof helpText === 'string' ? (
              <p className="field-help">{helpText}</p>
            ) : (
              <div className="field-help">{helpText}</div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
