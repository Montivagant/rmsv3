import React from 'react';
import { Link } from 'react-router-dom';
import { NavIcon } from './navigation/NavIcon';

interface PageStubProps {
  title: string;
  description: string;
  icon?: string;
  backPath?: string;
  backLabel?: string;
  comingSoon?: boolean;
  features?: string[];
  className?: string;
}

export const PageStub: React.FC<PageStubProps> = ({
  title,
  description,
  icon,
  backPath,
  backLabel = 'Back',
  comingSoon = true,
  features = [],
  className = '',
}) => {
  return (
    <div className={`p-6 ${className}`}>
      {/* Back navigation */}
      {backPath && (
        <div className="mb-6">
          <Link
            to={backPath}
            className="inline-flex items-center space-x-2 text-sm text-text-secondary hover:text-text-primary transition-colors focus-ring rounded-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>{backLabel}</span>
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="max-w-3xl">
        <div className="flex items-start space-x-4 mb-6">
          {icon && (
            <div className="flex-shrink-0 mt-1">
              <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center">
                <NavIcon path={icon} className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              </div>
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-text-primary mb-2">{title}</h1>
            <p className="text-lg text-text-secondary">{description}</p>
          </div>
        </div>

        {/* Coming soon badge */}
        {comingSoon && (
          <div className="mb-6">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-warning-100 text-warning-800 dark:bg-warning-500/20 dark:text-warning-400">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Coming Soon
            </span>
          </div>
        )}

        {/* Features list */}
        {features.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-text-primary mb-4">Planned Features</h2>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-text-secondary">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Placeholder content area */}
        {!comingSoon && (
          <div className="mt-8 p-8 bg-surface-secondary rounded-lg border-2 border-dashed border-border-secondary">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="mt-4 text-lg font-medium text-text-primary">Page Content Area</p>
              <p className="text-text-secondary">This page is ready for implementation.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageStub;
