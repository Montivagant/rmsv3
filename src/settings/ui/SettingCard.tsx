import React from 'react';

type SettingCardProps = {
  title?: string;
  description?: string | React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
};

export default function SettingCard({
  title,
  description,
  actions,
  children,
  className,
  footer,
}: SettingCardProps) {
  return (
    <div
      className={[
        'bg-surface border border-primary rounded-lg shadow-sm',
        'p-4 sm:p-5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="group"
      aria-label={title ? String(title) : undefined}
    >
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && <h3 className="text-h3 text-primary">{title}</h3>}
            {description ? (
              typeof description === 'string' ? (
                <p className="text-body-sm text-tertiary mt-1">{description}</p>
              ) : (
                <div className="mt-1">{description}</div>
              )
            ) : null}
          </div>
          {actions ? (
            <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>
          ) : null}
        </div>
      )}

      <div className="space-y-4">{children}</div>

      {footer ? <div className="mt-4 pt-4 border-t border-secondary">{footer}</div> : null}
    </div>
  );
}
