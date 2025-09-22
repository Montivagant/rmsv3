/**
 * Accessibility Utilities and ARIA Management
 * Provides comprehensive accessibility features for WCAG AA compliance
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'

// Accessibility context for managing global a11y state
interface AccessibilityContextType {
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
  focusElement: (elementId: string) => void
  registerLandmark: (id: string, label: string, role: string) => void
  skipLinks: { id: string; label: string }[]
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null)

// Screen reader announcements
export const useScreenReader = () => {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useScreenReader must be used within AccessibilityProvider')
  }
  return context
}

// Live region for screen reader announcements
export const LiveRegion: React.FC<{ 
  id?: string
  politeness?: 'polite' | 'assertive' 
  atomic?: boolean
  relevant?: 'additions' | 'additions text' | 'all' | 'removals' | 'text'
}> = ({ 
  id = 'live-region', 
  politeness = 'polite', 
  atomic = true,
  relevant = 'additions text'
}) => {
  const [announcements, setAnnouncements] = useState<string[]>([])

  useEffect(() => {
    const handleAnnouncement = (event: CustomEvent) => {
      const { message, priority } = event.detail
      if (priority === politeness || (!priority && politeness === 'polite')) {
        setAnnouncements(prev => [...prev.slice(-4), message]) // Keep last 5 messages
      }
    }

    window.addEventListener(`announce-${politeness}`, handleAnnouncement as EventListener)
    return () => {
      window.removeEventListener(`announce-${politeness}`, handleAnnouncement as EventListener)
    }
  }, [politeness])

  return (
    <div
      id={id}
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className="sr-only"
    >
      {announcements.map((announcement, index) => (
        <div key={`${announcement}-${index}`}>{announcement}</div>
      ))}
    </div>
  )
}

// Skip links component
export const SkipLinks: React.FC<{ 
  links: { href: string; label: string }[]
  className?: string 
}> = ({ links, className = '' }) => {
  return (
    <nav aria-label="Skip links" className={`sr-only focus-within:not-sr-only ${className}`}>
      <ul className="flex space-x-2 bg-brand-600 text-inverse p-2">
        {links.map((link, index) => (
          <li key={index}>
            <a
              href={link.href}
              className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600 px-2 py-1 rounded"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ARIA label utilities
export const generateAriaLabel = {
  form: (title: string, required: boolean = false) => 
    `${title}${required ? ' form, required fields marked with asterisk' : ' form'}`,
  
  field: (label: string, required: boolean = false, helpText?: string) => 
    `${label}${required ? ', required' : ''}${helpText ? `, ${helpText}` : ''}`,
  
  button: (action: string, context?: string, disabled: boolean = false) => 
    `${action}${context ? ` ${context}` : ''}${disabled ? ', disabled' : ''}`,
  
  table: (title: string, rowCount: number, columnCount: number) =>
    `${title} table with ${rowCount} rows and ${columnCount} columns`,
  
  list: (title: string, itemCount: number, type: 'ordered' | 'unordered' = 'unordered') =>
    `${title}, ${type} list with ${itemCount} items`,
  
  dialog: (title: string, modal: boolean = true) =>
    `${title}${modal ? ' modal dialog' : ' dialog'}`,
  
  navigation: (label: string, level?: string) =>
    `${label}${level ? ` ${level}` : ''} navigation`,
  
  status: (message: string, type: 'error' | 'warning' | 'success' | 'info' = 'info') =>
    `${type}: ${message}`,
  
  progress: (current: number, total: number, label?: string) =>
    `${label ? `${label}, ` : ''}progress ${current} of ${total}`,
  
  autocomplete: (query: string, resultCount: number) =>
    `${resultCount} suggestions for ${query}`
}

// Screen-reader only text component
export const ScreenReaderOnly: React.FC<{ 
  children: React.ReactNode
  as?: React.ElementType
}> = ({ children, as: Component = 'span' }) => {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  )
}

// Focus management utilities
export const useFocusManagement = () => {
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const trapRef = useRef<HTMLElement | null>(null)

  const saveFocus = () => {
    previousFocusRef.current = document.activeElement as HTMLElement
  }

  const restoreFocus = () => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus()
    }
  }

  const trapFocus = (container: HTMLElement) => {
    trapRef.current = container
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    if (firstElement) firstElement.focus()

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }

  return { saveFocus, restoreFocus, trapFocus }
}

// Keyboard navigation utilities
export const useKeyboardNavigation = (
  items: HTMLElement[] | (() => HTMLElement[]),
  options: {
    loop?: boolean
    orientation?: 'horizontal' | 'vertical' | 'both'
    onItemFocus?: (index: number, item: HTMLElement) => void
  } = {}
) => {
  const { loop = true, orientation = 'vertical', onItemFocus } = options
  const [currentIndex, setCurrentIndex] = useState(0)

  const getItems = () => Array.isArray(items) ? items : items()

  const handleKeyDown = (e: KeyboardEvent) => {
    const itemList = getItems()
    if (itemList.length === 0) return

    let newIndex = currentIndex

    switch (e.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault()
          newIndex = loop && currentIndex === itemList.length - 1 ? 0 : Math.min(currentIndex + 1, itemList.length - 1)
        }
        break
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault()
          newIndex = loop && currentIndex === 0 ? itemList.length - 1 : Math.max(currentIndex - 1, 0)
        }
        break
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault()
          newIndex = loop && currentIndex === itemList.length - 1 ? 0 : Math.min(currentIndex + 1, itemList.length - 1)
        }
        break
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault()
          newIndex = loop && currentIndex === 0 ? itemList.length - 1 : Math.max(currentIndex - 1, 0)
        }
        break
      case 'Home':
        e.preventDefault()
        newIndex = 0
        break
      case 'End':
        e.preventDefault()
        newIndex = itemList.length - 1
        break
    }

    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex)
      itemList[newIndex]?.focus()
      onItemFocus?.(newIndex, itemList[newIndex])
    }
  }

  return { currentIndex, setCurrentIndex, handleKeyDown }
}

// High contrast mode detection
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = useState(false)

  useEffect(() => {
    const checkHighContrast = () => {
      // Check for Windows high contrast mode
      const media = window.matchMedia('(prefers-contrast: high)')
      setIsHighContrast(media.matches)
    }

    checkHighContrast()
    
    const media = window.matchMedia('(prefers-contrast: high)')
    media.addEventListener('change', checkHighContrast)
    
    return () => media.removeEventListener('change', checkHighContrast)
  }, [])

  return isHighContrast
}

// Reduced motion detection
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(media.matches)

    const handleChange = () => setPrefersReducedMotion(media.matches)
    media.addEventListener('change', handleChange)
    
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

// Accessible table component
export interface AccessibleTableProps {
  caption: string
  headers: { id: string; label: string; scope?: 'col' | 'row' }[]
  rows: { id: string; cells: { headerId: string; content: React.ReactNode }[] }[]
  sortable?: boolean
  onSort?: (headerId: string, direction: 'asc' | 'desc') => void
  className?: string
}

export const AccessibleTable: React.FC<AccessibleTableProps> = ({
  caption,
  headers,
  rows,
  sortable = false,
  onSort,
  className = ''
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (headerId: string) => {
    if (!sortable || !onSort) return

    const newDirection = sortColumn === headerId && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortColumn(headerId)
    setSortDirection(newDirection)
    onSort(headerId, newDirection)
  }

  return (
    <table 
      className={`w-full border-collapse ${className}`}
      role="table"
      aria-label={generateAriaLabel.table(caption, rows.length, headers.length)}
    >
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr role="row">
          {headers.map((header) => (
            <th
              key={header.id}
              scope={header.scope || 'col'}
              role="columnheader"
              aria-sort={
                sortable && sortColumn === header.id 
                  ? sortDirection === 'asc' ? 'ascending' : 'descending'
                  : sortable ? 'none' : undefined
              }
              className={`p-3 text-left border-b border-border bg-surface-secondary ${
                sortable ? 'cursor-pointer hover:bg-surface-secondary' : ''
              }`}
              onClick={sortable ? () => handleSort(header.id) : undefined}
              onKeyDown={sortable ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleSort(header.id)
                }
              } : undefined}
              tabIndex={sortable ? 0 : undefined}
            >
              <div className="flex items-center justify-between">
                <span>{header.label}</span>
                {sortable && (
                  <span aria-hidden="true" className="ml-2">
                    {sortColumn === header.id ? (
                      sortDirection === 'asc' ? 'â†‘' : 'â†“'
                    ) : 'â†•'}
                  </span>
                )}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} role="row">
            {row.cells.map((cell) => {
              return (
                <td
                  key={cell.headerId}
                  role="gridcell"
                  headers={cell.headerId}
                  className="p-3 border-b border-border"
              >
                  {cell.content}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Accessible modal/dialog component
export interface AccessibleModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlayClick?: boolean
  closeOnEsc?: boolean
  className?: string
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const { saveFocus, restoreFocus, trapFocus } = useFocusManagement()

  useEffect(() => {
    if (isOpen) {
      saveFocus()
      if (modalRef.current) {
        const cleanup = trapFocus(modalRef.current)
        return cleanup
      }
    } else {
      restoreFocus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!closeOnEsc) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, closeOnEsc, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div
          className="modal-backdrop"
          onClick={closeOnOverlayClick ? onClose : undefined}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          ref={modalRef}
          className={`relative bg-surface rounded-lg shadow-xl w-full ${sizeClasses[size]} ${className}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border border-border">
            <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
              {title}
            </h2>
            <button
              onClick={onClose}
                className="text-text-tertiary hover:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand rounded"
              aria-label="Close dialog"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          {description && (
          <div id="modal-description" className="px-6 pt-4 text-sm text-text-secondary">
            {description}
          </div>
          )}

          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// Accessibility provider
export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [skipLinks, setSkipLinks] = useState<{ id: string; label: string }[]>([])

  const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const event = new CustomEvent(`announce-${priority}`, {
      detail: { message, priority }
    })
    window.dispatchEvent(event)
  }

  const focusElement = (elementId: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      element.focus()
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const registerLandmark = (id: string, label: string) => {
    setSkipLinks(prev => {
      const exists = prev.find(link => link.id === id)
      if (exists) return prev
      return [...prev, { id, label }]
    })
  }

  const contextValue: AccessibilityContextType = {
    announceToScreenReader,
    focusElement,
    registerLandmark,
    skipLinks
  }

  return (
    <AccessibilityContext.Provider value={contextValue}>
      <LiveRegion politeness="polite" />
      <LiveRegion politeness="assertive" />
      {children}
    </AccessibilityContext.Provider>
  )
}

export default {
  AccessibilityProvider,
  SkipLinks,
  LiveRegion,
  ScreenReaderOnly,
  AccessibleTable,
  AccessibleModal,
  generateAriaLabel,
  useScreenReader,
  useFocusManagement,
  useKeyboardNavigation,
  useHighContrastMode,
  useReducedMotion
}

