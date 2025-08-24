/**
 * Screen Reader Optimization and Assistive Technology Support
 * Provides comprehensive optimization for screen readers and assistive technologies
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '../../utils/cn'

// Screen reader announcement hook
export function useAnnouncement() {
  const [currentAnnouncement, setCurrentAnnouncement] = useState('')
  const timeoutRef = useRef<NodeJS.Timeout>()

  const announce = useCallback((
    message: string, 
    options: {
      priority?: 'polite' | 'assertive'
      delay?: number
      clearPrevious?: boolean
    } = {}
  ) => {
    const { priority = 'polite', delay = 0, clearPrevious = true } = options

    if (clearPrevious && timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    const makeAnnouncement = () => {
      // Clear previous announcement first if needed
      if (clearPrevious) {
        setCurrentAnnouncement('')
        setTimeout(() => setCurrentAnnouncement(message), 100)
      } else {
        setCurrentAnnouncement(message)
      }

      // Auto-clear after announcement
      timeoutRef.current = setTimeout(() => {
        setCurrentAnnouncement('')
      }, 5000)
    }

    if (delay > 0) {
      timeoutRef.current = setTimeout(makeAnnouncement, delay)
    } else {
      makeAnnouncement()
    }
  }, [])

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setCurrentAnnouncement('')
  }, [])

  return { announce, clear, currentAnnouncement }
}

// Live region component for announcements
export const AnnouncementRegion: React.FC<{
  announcement: string
  priority?: 'polite' | 'assertive'
  id?: string
}> = ({ announcement, priority = 'polite', id = 'announcement-region' }) => {
  return (
    <div
      id={id}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

// Progress announcements for long operations
export function useProgressAnnouncement(
  current: number,
  total: number,
  label: string = 'Progress'
) {
  const { announce } = useAnnouncement()
  const lastAnnouncedRef = useRef(-1)

  useEffect(() => {
    const percentage = Math.round((current / total) * 100)
    const shouldAnnounce = percentage !== lastAnnouncedRef.current && percentage % 10 === 0

    if (shouldAnnounce) {
      announce(`${label}: ${percentage}% complete`, { priority: 'polite' })
      lastAnnouncedRef.current = percentage
    }
  }, [current, total, label, announce])

  return { announce }
}

// Form field descriptions for screen readers
export const FieldDescription: React.FC<{
  id: string
  children: React.ReactNode
  className?: string
}> = ({ id, children, className = '' }) => {
  return (
    <div
      id={id}
      className={cn('text-sm text-gray-600 dark:text-gray-400 mt-1', className)}
    >
      {children}
    </div>
  )
}

// Error announcements for form fields
export const ErrorAnnouncement: React.FC<{
  error?: string
  fieldName: string
  immediate?: boolean
}> = ({ error, fieldName, immediate = false }) => {
  const { announce } = useAnnouncement()
  const previousError = useRef<string>()

  useEffect(() => {
    if (error && error !== previousError.current) {
      const message = `Error in ${fieldName}: ${error}`
      announce(message, { 
        priority: immediate ? 'assertive' : 'polite',
        delay: immediate ? 0 : 500
      })
      previousError.current = error
    }
  }, [error, fieldName, immediate, announce])

  return null
}

// Status updates component
export interface StatusUpdate {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  timestamp: number
}

export const StatusUpdates: React.FC<{
  updates: StatusUpdate[]
  maxVisible?: number
  autoHide?: boolean
  hideDelay?: number
}> = ({ updates, maxVisible = 3, autoHide = true, hideDelay = 5000 }) => {
  const [visibleUpdates, setVisibleUpdates] = useState<StatusUpdate[]>([])
  const { announce } = useAnnouncement()

  useEffect(() => {
    // Show latest updates
    const latest = updates.slice(-maxVisible)
    setVisibleUpdates(latest)

    // Announce new updates
    const newUpdates = latest.filter(update => 
      !visibleUpdates.find(visible => visible.id === update.id)
    )
    
    newUpdates.forEach(update => {
      const priority = update.type === 'error' ? 'assertive' : 'polite'
      announce(`${update.type}: ${update.message}`, { priority })
    })

    // Auto-hide updates
    if (autoHide) {
      const timeouts = latest.map(update => 
        setTimeout(() => {
          setVisibleUpdates(prev => prev.filter(u => u.id !== update.id))
        }, hideDelay)
      )

      return () => timeouts.forEach(clearTimeout)
    }
  }, [updates, maxVisible, autoHide, hideDelay, announce, visibleUpdates])

  if (visibleUpdates.length === 0) return null

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Status updates"
      className="fixed top-4 right-4 z-50 space-y-2"
    >
      {visibleUpdates.map(update => {
        const typeStyles = {
          success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
          error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
          warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
          info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
        }

        return (
          <div
            key={update.id}
            className={cn(
              'p-3 border rounded-md shadow-sm',
              typeStyles[update.type]
            )}
            role="status"
            aria-atomic="true"
          >
            <div className="flex items-start">
              <div className="flex-1">
                <p className="font-medium">{update.type.charAt(0).toUpperCase() + update.type.slice(1)}</p>
                <p className="text-sm">{update.message}</p>
              </div>
              <button
                onClick={() => setVisibleUpdates(prev => prev.filter(u => u.id !== update.id))}
                className="ml-2 text-current opacity-60 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-1 rounded"
                aria-label="Dismiss notification"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Dynamic content announcements
export const ContentChangeAnnouncer: React.FC<{
  children: React.ReactNode
  announceChanges?: boolean
  changeDescription?: string
}> = ({ children, announceChanges = true, changeDescription }) => {
  const { announce } = useAnnouncement()
  const previousContent = useRef<string>()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!announceChanges || !containerRef.current) return

    const currentContent = containerRef.current.textContent || ''
    if (previousContent.current && currentContent !== previousContent.current) {
      const message = changeDescription || 'Content has been updated'
      announce(message, { priority: 'polite', delay: 500 })
    }
    previousContent.current = currentContent
  }, [children, announceChanges, changeDescription, announce])

  return (
    <div ref={containerRef}>
      {children}
    </div>
  )
}

// Data table with comprehensive screen reader support
export interface AccessibleDataTableProps {
  caption: string
  headers: Array<{
    id: string
    label: string
    sortable?: boolean
    description?: string
  }>
  rows: Array<{
    id: string
    cells: Array<{
      headerId: string
      content: React.ReactNode
      description?: string
    }>
  }>
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (headerId: string, direction: 'asc' | 'desc') => void
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export const AccessibleDataTable: React.FC<AccessibleDataTableProps> = ({
  caption,
  headers,
  rows,
  sortColumn,
  sortDirection,
  onSort,
  loading = false,
  emptyMessage = 'No data available',
  className = ''
}) => {
  const { announce } = useAnnouncement()
  const tableId = React.useId()

  const handleSort = (headerId: string) => {
    if (!onSort) return

    const newDirection = sortColumn === headerId && sortDirection === 'asc' ? 'desc' : 'asc'
    onSort(headerId, newDirection)

    const header = headers.find(h => h.id === headerId)
    if (header) {
      announce(`Table sorted by ${header.label}, ${newDirection === 'asc' ? 'ascending' : 'descending'}`)
    }
  }

  const tableDescription = `Data table with ${rows.length} rows and ${headers.length} columns. ${
    loading ? 'Loading data.' : ''
  } ${
    sortColumn ? `Currently sorted by ${headers.find(h => h.id === sortColumn)?.label} in ${sortDirection} order.` : ''
  }`

  return (
    <div className={cn('w-full', className)}>
      {/* Table summary for screen readers */}
      <div id={`${tableId}-summary`} className="sr-only">
        {tableDescription}
      </div>

      <table
        role="table"
        aria-label={caption}
        aria-describedby={`${tableId}-summary`}
        className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
      >
        <caption className="sr-only">{caption}</caption>
        
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {headers.map((header) => (
              <th
                key={header.id}
                scope="col"
                className={cn(
                  'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                  header.sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none'
                )}
                onClick={header.sortable ? () => handleSort(header.id) : undefined}
                onKeyDown={header.sortable ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSort(header.id)
                  }
                } : undefined}
                tabIndex={header.sortable ? 0 : undefined}
                aria-sort={
                  header.sortable && sortColumn === header.id
                    ? sortDirection === 'asc' ? 'ascending' : 'descending'
                    : header.sortable ? 'none' : undefined
                }
                aria-describedby={header.description ? `${header.id}-desc` : undefined}
              >
                <div className="flex items-center space-x-1">
                  <span>{header.label}</span>
                  {header.sortable && (
                    <span aria-hidden="true" className="text-gray-400">
                      {sortColumn === header.id ? (
                        sortDirection === 'asc' ? '↑' : '↓'
                      ) : '↕'}
                    </span>
                  )}
                </div>
                
                {header.description && (
                  <div id={`${header.id}-desc`} className="sr-only">
                    {header.description}
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <tr>
              <td colSpan={headers.length} className="px-6 py-4 text-center">
                <div role="status" aria-live="polite">
                  Loading data...
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {row.cells.map((cell) => {
                  const header = headers.find(h => h.id === cell.headerId)
                  return (
                    <td
                      key={cell.headerId}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100"
                      headers={cell.headerId}
                      aria-describedby={cell.description ? `${row.id}-${cell.headerId}-desc` : undefined}
                    >
                      {cell.content}
                      {cell.description && (
                        <div id={`${row.id}-${cell.headerId}-desc`} className="sr-only">
                          {cell.description}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// Form with comprehensive screen reader support
export const ScreenReaderOptimizedForm: React.FC<{
  title: string
  description?: string
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  submitLabel?: string
  isSubmitting?: boolean
  errors?: Record<string, string>
  className?: string
}> = ({
  title,
  description,
  children,
  onSubmit,
  submitLabel = 'Submit',
  isSubmitting = false,
  errors = {},
  className = ''
}) => {
  const { announce } = useAnnouncement()
  const formId = React.useId()
  const errorCount = Object.keys(errors).length

  useEffect(() => {
    if (errorCount > 0) {
      const message = `Form has ${errorCount} error${errorCount > 1 ? 's' : ''}. Please review and correct the highlighted fields.`
      announce(message, { priority: 'assertive', delay: 500 })
    }
  }, [errorCount, announce])

  return (
    <form
      id={formId}
      onSubmit={onSubmit}
      className={cn('space-y-6', className)}
      aria-labelledby={`${formId}-title`}
      aria-describedby={description ? `${formId}-description` : undefined}
      noValidate
    >
      <div>
        <h2 id={`${formId}-title`} className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        {description && (
          <p id={`${formId}-description`} className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
        {errorCount > 0 && (
          <div role="alert" className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Please correct the following errors:
            </h3>
            <ul className="mt-1 list-disc list-inside text-sm text-red-700 dark:text-red-300">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {children}

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-describedby={isSubmitting ? `${formId}-submitting` : undefined}
        >
          {isSubmitting && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {isSubmitting ? 'Submitting...' : submitLabel}
        </button>
      </div>

      {isSubmitting && (
        <div id={`${formId}-submitting`} className="sr-only" aria-live="polite">
          Form is being submitted, please wait.
        </div>
      )}
    </form>
  )
}

export default {
  useAnnouncement,
  useProgressAnnouncement,
  AnnouncementRegion,
  FieldDescription,
  ErrorAnnouncement,
  StatusUpdates,
  ContentChangeAnnouncer,
  AccessibleDataTable,
  ScreenReaderOptimizedForm
}