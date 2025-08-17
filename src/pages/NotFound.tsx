import { Link } from 'react-router-dom'
import { Button } from '../components/Button'

export function NotFound() {
  const isOffline = !navigator.onLine

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full text-center px-4">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-400 dark:text-gray-600 mb-4">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {isOffline ? 'Page Unavailable Offline' : 'Page Not Found'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {isOffline 
              ? 'This page is not available while offline. Please check your connection and try again.'
              : 'The page you\'re looking for doesn\'t exist or has been moved.'
            }
          </p>
        </div>
        
        <div className="space-y-4">
          <Link to="/">
            <Button className="w-full">
              {isOffline ? 'Go to Dashboard' : 'Back to Home'}
            </Button>
          </Link>
          
          {!isOffline && (
            <button
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
        
        {isOffline && (
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center justify-center text-yellow-800 dark:text-yellow-200">
              <span className="mr-2">⚠</span>
              <span className="text-sm">
                You're currently offline. Some features may be limited.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}