import React from 'react';

type SettingSectionProps = {
  id: string;
  title: string;
  description?: string | React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export default function SettingSection({ id, title, description, className, children }: SettingSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={['space-y-4', className].filter(Boolean).join(' ')}>
      <header className="space-y-1">
        <h2 id={`${id}-title`} className="text-h2 text-primary">{title}</h2>
        {description ? (
          <p className="text-body-sm text-tertiary">{description}</p>
        ) : null}
      </header>
      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
}
