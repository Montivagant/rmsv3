/**
 * Enhanced Error Handling System
 * User-friendly error messages with recovery options and error boundaries
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { cn } from '../../utils/cn'

// Error types for different scenarios
export interface AppError {
  code: string
  message: string
  details?: string
  recoverable?: boolean
  userMessage?: string
  retryAction?: () => void
  contactSupport?: boolean
}

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showErrorDetails?: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error for monitoring
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo)
      }

      return (
        <ErrorDisplay
          title="Something went wrong"
          message="An unexpected error occurred. Please try refreshing the page."
          error={this.state.error?.message}
          showDetails={this.props.showErrorDetails}
          onRetry={this.handleRetry}
          actions={[
            {
              label: 'Refresh Page',
              action: () => window.location.reload(),
              variant: 'primary'
            }
          ]}
        />
      )
    }

    return this.props.children
  }
}

// Error display component
export interface ErrorAction {
  label: string
  action: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
}

export interface ErrorDisplayProps {
  title: string
  message: string
  error?: string
  showDetails?: boolean
  onRetry?: () => void
  actions?: ErrorAction[]
  className?: string
  variant?: 'error' | 'warning' | 'info'
  icon?: ReactNode
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title,
  message,
  error,
  showDetails = false,
  onRetry,
  actions = [],
  className,
  variant = 'error',
  icon
}) => {
  const [detailsOpen, setDetailsOpen] = React.useState(false)

  const variantClasses = {
    error: {
      container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      icon: 'text-red-400',
      title: 'text-red-800 dark:text-red-200',
      message: 'text-red-700 dark:text-red-300'
    },
    warning: {
      container: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-400',
      title: 'text-yellow-800 dark:text-yellow-200',
      message: 'text-yellow-700 dark:text-yellow-300'
    },
    info: {
      container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      icon: 'text-blue-400',
      title: 'text-blue-800 dark:text-blue-200',
      message: 'text-blue-700 dark:text-blue-300'
    }
  }

  const defaultIcon = variant === 'error' ? (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ) : variant === 'warning' ? (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  )

  return (
    <div className={cn(
      'border rounded-lg p-6',
      variantClasses[variant].container,
      className
    )} role="alert">
      <div className="flex items-start">
        <div className={cn('flex-shrink-0', variantClasses[variant].icon)}>
          {icon || defaultIcon}
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className={cn('text-lg font-medium', variantClasses[variant].title)}>
            {title}
          </h3>
          
          <p className={cn('mt-2 text-sm', variantClasses[variant].message)}>
            {message}
          </p>

          {error && showDetails && (
            <div className="mt-4">
              <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className={cn(
                  'text-sm font-medium underline hover:no-underline',
                  variantClasses[variant].title
                )}
              >
                {detailsOpen ? 'Hide' : 'Show'} technical details
              </button>
              
              {detailsOpen && (
                <div className="mt-2 p-3 bg-white/50 dark:bg-gray-800/50 rounded border">
                  <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">
                    {error}
                  </pre>
                </div>
              )}
            </div>
          )}

          {(onRetry || actions.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Try Again
                </button>
              )}
              
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  disabled={action.disabled}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    action.variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
                    action.variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
                    (!action.variant || action.variant === 'secondary') && 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700',
                    action.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Error message component for inline errors
export interface ErrorMessageProps {
  message: string
  className?: string
  showIcon?: boolean
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  className,
  showIcon = true
}) => {
  return (
    <div className={cn('flex items-center text-red-600 dark:text-red-400 text-sm', className)}>
      {showIcon && (
        <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
      <span>{message}</span>
    </div>
  )
}

// Success message component
export interface SuccessMessageProps {
  message: string
  className?: string
  showIcon?: boolean
  onDismiss?: () => void
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({
  message,
  className,
  showIcon = true,
  onDismiss
}) => {
  return (
    <div className={cn(
      'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4',
      className
    )}>
      <div className="flex items-center">
        {showIcon && (
          <svg className="h-5 w-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )}
        <span className="text-green-800 dark:text-green-200 text-sm font-medium flex-1">
          {message}
        </span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 text-green-400 hover:text-green-600 dark:hover:text-green-300"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// Common error scenarios and their user-friendly messages
export const errorMessages = {
  network: {
    code: 'NETWORK_ERROR',
    userMessage: 'Unable to connect to the server. Please check your internet connection.',
    recoverable: true
  },
  validation: {
    code: 'VALIDATION_ERROR',
    userMessage: 'Please check your input and try again.',
    recoverable: true
  },
  unauthorized: {
    code: 'UNAUTHORIZED',
    userMessage: 'You are not authorized to perform this action.',
    recoverable: false,
    contactSupport: true
  },
  notFound: {
    code: 'NOT_FOUND',
    userMessage: 'The requested item could not be found.',
    recoverable: false
  },
  serverError: {
    code: 'SERVER_ERROR',
    userMessage: 'A server error occurred. Please try again later.',
    recoverable: true,
    contactSupport: true
  },
  timeout: {
    code: 'TIMEOUT',
    userMessage: 'The request timed out. Please try again.',
    recoverable: true
  }
}

// Hook for managing error state
export function useErrorHandler() {
  const [error, setError] = React.useState<AppError | null>(null)

  const handleError = React.useCallback((error: unknown, context?: string) => {
    console.error('Error occurred:', error, context)

    let appError: AppError

    if (error instanceof Error) {
      // Network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        appError = { ...errorMessages.network, message: error.message }
      }
      // Validation errors
      else if (error.message.includes('validation') || error.message.includes('invalid')) {
        appError = { ...errorMessages.validation, message: error.message }
      }
      // Default error
      else {
        appError = {
          code: 'UNKNOWN_ERROR',
          message: error.message,
          userMessage: 'An unexpected error occurred.',
          recoverable: true
        }
      }
    } else if (typeof error === 'string') {
      appError = {
        code: 'STRING_ERROR',
        message: error,
        userMessage: error,
        recoverable: true
      }
    } else {
      appError = {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error',
        userMessage: 'An unexpected error occurred.',
        recoverable: true
      }
    }

    setError(appError)
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
  }, [])

  const retry = React.useCallback(() => {
    if (error?.retryAction) {
      error.retryAction()
    }
    clearError()
  }, [error, clearError])

  return {
    error,
    handleError,
    clearError,
    retry
  }
}

export default {
  ErrorBoundary,
  ErrorDisplay,
  ErrorMessage,
  SuccessMessage,
  useErrorHandler,
  errorMessages
}