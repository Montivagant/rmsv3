/**
 * Loading States and Skeleton Components
 * Provides consistent loading experiences across the application
 */

import React from 'react'
import { cn } from '../../utils/cn'

// Basic loading spinner
export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'white' | 'gray'
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className
}) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4', 
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  const colorClasses = {
    primary: 'border-blue-600 border-t-transparent',
    secondary: 'border-gray-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-400 border-t-transparent'
  }

  return (
    <div 
      className={cn(
        'animate-spin rounded-full border-2',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

// Skeleton components for different content types
export interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animate?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  animate = true
}) => {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-md'
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700',
        animate && 'animate-pulse',
        variantClasses[variant],
        className
      )}
      style={style}
      role="status"
      aria-label="Loading content"
    />
  )
}

// Table skeleton for loading data tables
export interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  className?: string
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className
}) => {
  return (
    <div className={cn('w-full', className)} role="status" aria-label="Loading table">
      <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
        {showHeader && (
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-4">
              {Array.from({ length: columns }, (_, i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        )}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: rows }, (_, rowIndex) => (
            <div key={rowIndex} className="px-6 py-4">
              <div className="flex space-x-4">
                {Array.from({ length: columns }, (_, colIndex) => (
                  <Skeleton 
                    key={colIndex} 
                    className="h-4 flex-1"
                    animate={true}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Card skeleton for loading content cards
export interface CardSkeletonProps {
  showImage?: boolean
  showActions?: boolean
  lines?: number
  className?: string
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showImage = true,
  showActions = true,
  lines = 3,
  className
}) => {
  return (
    <div 
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6',
        className
      )}
      role="status"
      aria-label="Loading card"
    >
      {showImage && (
        <Skeleton 
          variant="rectangular" 
          className="w-full h-48 mb-4 rounded-md" 
        />
      )}
      
      <div className="space-y-3">
        {/* Title */}
        <Skeleton className="h-6 w-3/4" />
        
        {/* Content lines */}
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton 
            key={i} 
            className="h-4"
            width={i === lines - 1 ? '60%' : '100%'}
          />
        ))}
      </div>

      {showActions && (
        <div className="flex space-x-2 mt-6">
          <Skeleton variant="rounded" className="h-9 w-20" />
          <Skeleton variant="rounded" className="h-9 w-16" />
        </div>
      )}
    </div>
  )
}

// Form skeleton for loading forms
export interface FormSkeletonProps {
  fields?: number
  showSubmit?: boolean
  className?: string
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 5,
  showSubmit = true,
  className
}) => {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-label="Loading form">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          {/* Label */}
          <Skeleton className="h-4 w-24" />
          {/* Input */}
          <Skeleton variant="rounded" className="h-10 w-full" />
          {/* Help text */}
          {Math.random() > 0.5 && (
            <Skeleton className="h-3 w-48" />
          )}
        </div>
      ))}

      {showSubmit && (
        <div className="flex justify-end space-x-3 pt-6">
          <Skeleton variant="rounded" className="h-10 w-20" />
          <Skeleton variant="rounded" className="h-10 w-24" />
        </div>
      )}
    </div>
  )
}

// Progress bar for loading operations
export interface ProgressBarProps {
  value?: number // 0-100
  indeterminate?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  label?: string
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value = 0,
  indeterminate = false,
  size = 'md',
  color = 'primary',
  showLabel = false,
  label,
  className
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  const colorClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  }

  const progress = Math.min(Math.max(value, 0), 100)

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {label || 'Progress'}
          </span>
          {!indeterminate && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {progress}%
            </span>
          )}
        </div>
      )}
      
      <div className={cn(
        'bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            colorClasses[color],
            indeterminate && 'animate-pulse'
          )}
          style={{
            width: indeterminate ? '100%' : `${progress}%`,
            animation: indeterminate ? 'indeterminate 2s ease-in-out infinite' : undefined
          }}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || 'Progress'}
        />
      </div>
    </div>
  )
}

// Optimistic update wrapper
export interface OptimisticWrapperProps {
  isPending?: boolean
  error?: string | null
  retryAction?: () => void
  children: React.ReactNode
  pendingContent?: React.ReactNode
  className?: string
}

export const OptimisticWrapper: React.FC<OptimisticWrapperProps> = ({
  isPending = false,
  error = null,
  retryAction,
  children,
  pendingContent,
  className
}) => {
  if (error) {
    return (
      <div className={cn('bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4', className)}>
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Something went wrong
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error}
            </p>
          </div>
          {retryAction && (
            <button
              onClick={retryAction}
              className="ml-3 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-1 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn(isPending && 'opacity-75 pointer-events-none transition-opacity', className)}>
      {isPending && pendingContent ? pendingContent : children}
      {isPending && !pendingContent && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center rounded-md">
          <LoadingSpinner size="lg" />
        </div>
      )}
    </div>
  )
}

// Loading state hook for managing async operations
export function useLoadingState<T = any>() {
  const [state, setState] = React.useState<{
    data: T | null
    loading: boolean
    error: string | null
  }>({
    data: null,
    loading: false,
    error: null
  })

  const execute = React.useCallback(async (asyncFn: () => Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const data = await asyncFn()
      setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      throw error
    }
  }, [])

  const reset = React.useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    execute,
    reset
  }
}

export default {
  LoadingSpinner,
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  FormSkeleton,
  ProgressBar,
  OptimisticWrapper,
  useLoadingState
}