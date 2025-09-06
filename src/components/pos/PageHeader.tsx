import React from 'react';

// Simple ChevronRight icon component
const ChevronRight = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, breadcrumb, actions }: PageHeaderProps) {
  return (
    <header className="bg-surface border-b border-border">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="flex items-center gap-2 text-sm mb-2" aria-label="Breadcrumb">
            {breadcrumb.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                {item.href ? (
                  <a 
                    href={item.href} 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className="text-foreground font-medium">{item.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h1>
            {description && (
              <p className="mt-1 text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
