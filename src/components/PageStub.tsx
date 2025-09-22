import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';

interface PageStubProps {
  title: string;
  description: string;
  icon?: string;
  backPath?: string;
  backLabel?: string;
  comingSoon?: boolean;
  features?: string[];
}

export function PageStub({
  title,
  description,
  icon,
  backPath,
  backLabel = 'Back',
  comingSoon = true,
  features = []
}: PageStubProps) {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        {backPath && (
          <div className="mb-4">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="text-text-muted hover:text-text-primary"
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {backLabel}
            </Button>
          </div>
        )}
        
        <div className="flex items-center gap-4">
          {icon && (
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-text-primary">{title}</h1>
            <p className="text-text-muted mt-1">{description}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {comingSoon && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                Coming Soon
              </span>
            )}
            {title} Module
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-secondary flex items-center justify-center">
              <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {comingSoon ? 'Under Development' : 'Module Available'}
            </h3>
            <p className="text-text-muted max-w-md mx-auto">
              {comingSoon 
                ? 'This module is currently being developed and will be available in a future release.'
                : 'This module is available and ready to use.'
              }
            </p>
          </div>

          {features.length > 0 && (
            <div>
              <h4 className="font-semibold text-text-primary mb-3">Planned Features:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-text-secondary">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {comingSoon && (
            <div className="bg-surface-secondary rounded-lg p-4">
              <p className="text-sm text-text-muted text-center">
                Want to be notified when this module is ready?{' '}
                <button className="text-primary hover:underline">
                  Contact us
                </button>{' '}
                for updates on development progress.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
