import { Link } from 'react-router-dom'
import { Button } from '../components/Button'

export function NotFound() {
  const isOffline = !navigator.onLine

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full text-center px-4">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-muted mb-4">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-primary mb-2">
            {isOffline ? 'Page Unavailable Offline' : 'Page Not Found'}
          </h2>
          <p className="text-secondary">
            {isOffline 
              ? 'This page is not available while offline. Please check your connection and try again.'
              : 'The page you\'re looking for doesn\'t exist or has been moved.'
            }
          </p>
        </div>

        <div className="space-y-4">
          <Link to="/">
            <Button variant="primary" className="w-full">
              Return to Dashboard
            </Button>
          </Link>
          
          {isOffline && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotFound