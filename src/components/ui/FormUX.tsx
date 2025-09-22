/**
 * Enhanced Form UX Features
 * Improved user experience with auto-focus, keyboard navigation, and auto-save
 */

import React, { useEffect, useRef, useCallback } from 'react'
import { cn } from '../../lib/utils'

// Auto-focus manager for forms
export interface AutoFocusManagerProps {
  children: React.ReactNode
  enabled?: boolean
  skipToFirstError?: boolean
  focusOnMount?: boolean
  retainFocusOnError?: boolean
}

export const AutoFocusManager: React.FC<AutoFocusManagerProps> = ({
  children,
  enabled = true,
  skipToFirstError = true,
  focusOnMount = true,
  retainFocusOnError = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastFocusedElement = useRef<HTMLElement | null>(null)

  // Focus first input on mount
  useEffect(() => {
    if (!enabled || !focusOnMount) return

    const timer = setTimeout(() => {
      const firstInput = containerRef.current?.querySelector(
        'input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly])'
      ) as HTMLElement

      if (firstInput) {
        firstInput.focus()
      }
    }, 100) // Small delay to ensure DOM is ready

    return () => clearTimeout(timer)
  }, [enabled, focusOnMount])

  // Handle keyboard navigation
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
        const target = e.target as HTMLElement
        
        // Skip if target is textarea (allow new lines)
        if (target.tagName === 'TEXTAREA') return
        
        // Skip if target is button (let it handle the event)
        if (target.tagName === 'BUTTON') return

        e.preventDefault()
        
        // Find next focusable element
        const focusableElements = Array.from(
          containerRef.current?.querySelectorAll(
            'input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly]), button:not([disabled])'
          ) || []
        ) as HTMLElement[]

        const currentIndex = focusableElements.indexOf(target)
        if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
          focusableElements[currentIndex + 1].focus()
        }
      }
    }

    const container = containerRef.current
    container?.addEventListener('keydown', handleKeyDown)

    return () => {
      container?.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled])

  // Track focus for error handling
  useEffect(() => {
    if (!enabled || !retainFocusOnError) return

    const handleFocus = (e: FocusEvent) => {
      lastFocusedElement.current = e.target as HTMLElement
    }

    const container = containerRef.current
    container?.addEventListener('focus', handleFocus, true)

    return () => {
      container?.removeEventListener('focus', handleFocus, true)
    }
  }, [enabled, retainFocusOnError])

  // Focus first error on validation
  const focusFirstError = useCallback(() => {
    if (!enabled || !skipToFirstError) return

    const firstError = containerRef.current?.querySelector(
      '[aria-invalid="true"], .error input, .error select, .error textarea'
    ) as HTMLElement

    if (firstError) {
      firstError.focus()
      // Scroll into view if needed
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [enabled, skipToFirstError])

  // Expose focusFirstError method to parent components
  const containerRefWithMethods = React.useRef<HTMLDivElement & { focusFirstError: () => void }>(null)
  
  React.useEffect(() => {
    if (containerRefWithMethods.current) {
      (containerRefWithMethods.current as any).focusFirstError = focusFirstError
    }
  }, [focusFirstError])

  return (
    <div ref={containerRef} className="focus-manager">
      {children}
    </div>
  )
}

// Auto-save hook with advanced features
export interface AutoSaveOptions {
  key: string
  debounceMs?: number
  enabled?: boolean
  onSave?: (data: any) => void
  onRestore?: (data: any) => void
  excludeFields?: string[]
  clearOnSubmit?: boolean
  showIndicator?: boolean
}

export function useAutoSave<T extends Record<string, any>>(
  data: T,
  options: AutoSaveOptions
) {
  const {
    key,
    debounceMs = 2000,
    enabled = true,
    onSave,
    onRestore,
    excludeFields = [],
    clearOnSubmit = true,
  } = options

  const [lastSaved, setLastSaved] = React.useState<Date | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hasChanges = useRef(false)

  // Filter out excluded fields
  const getFilteredData = useCallback((data: T): Partial<T> => {
    const filtered = { ...data }
    excludeFields.forEach(field => {
      delete filtered[field]
    })
    return filtered
  }, [excludeFields])

  // Save to localStorage
  const saveData = useCallback(async (dataToSave: T) => {
    if (!enabled) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const filteredData = getFilteredData(dataToSave)
      const savePayload = {
        data: filteredData,
        timestamp: Date.now(),
        version: 1
      }

      localStorage.setItem(`autosave-${key}`, JSON.stringify(savePayload))
      setLastSaved(new Date())
      hasChanges.current = false
      
      onSave?.(filteredData)
    } catch (error) {
      console.error('Auto-save failed:', error)
      setSaveError(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }, [enabled, key, getFilteredData, onSave])

  // Restore from localStorage
  const restoreData = useCallback((): Partial<T> | null => {
    if (!enabled) return null

    try {
      const saved = localStorage.getItem(`autosave-${key}`)
      if (!saved) return null

      const { data, timestamp } = JSON.parse(saved)
      
      // Check if data is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000
      if (Date.now() - timestamp > maxAge) {
        clearSavedData()
        return null
      }

      onRestore?.(data)
      return data
    } catch (error) {
      console.error('Failed to restore auto-saved data:', error)
      return null
    }
  }, [enabled, key, onRestore])

  // Clear saved data
  const clearSavedData = useCallback(() => {
    localStorage.removeItem(`autosave-${key}`)
    setLastSaved(null)
    hasChanges.current = false
  }, [key])

  // Debounced save effect
  useEffect(() => {
    if (!enabled || !hasChanges.current) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      saveData(data)
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, debounceMs, enabled, saveData])

  // Track changes
  useEffect(() => {
    hasChanges.current = true
  }, [data])

  // Clear on submit
  const handleSubmitSuccess = useCallback(() => {
    if (clearOnSubmit) {
      clearSavedData()
    }
  }, [clearOnSubmit, clearSavedData])

  return {
    lastSaved,
    isSaving,
    saveError,
    restoreData,
    clearSavedData,
    handleSubmitSuccess,
    hasUnsavedChanges: hasChanges.current
  }
}

// Auto-save indicator component
export interface AutoSaveIndicatorProps {
  lastSaved: Date | null
  isSaving: boolean
  error?: string | null
  className?: string
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  lastSaved,
  isSaving,
  error,
  className
}) => {
  if (error) {
    return (
      <div className={cn('flex items-center text-sm text-error-600 text-error-600', className)}>
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Auto-save failed
      </div>
    )
  }

  if (isSaving) {
    return (
      <div className={cn('flex items-center text-sm text-brand-600 text-brand-400', className)}>
        <svg className="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Saving...
      </div>
    )
  }

  if (lastSaved) {
    return (
      <div className={cn('flex items-center text-sm text-success-600 text-success-600', className)}>
        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        Saved {formatTimeAgo(lastSaved)}
      </div>
    )
  }

  return null
}

// Keyboard shortcut manager
export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
  preventDefault?: boolean
}

export interface KeyboardShortcutManagerProps {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
  showHelp?: boolean
}

export const KeyboardShortcutManager: React.FC<KeyboardShortcutManagerProps> = ({
  shortcuts,
  enabled = true,
  showHelp = false
}) => {
  const [helpVisible, setHelpVisible] = React.useState(false)

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const {
          key,
          ctrlKey = false,
          shiftKey = false,
          altKey = false,
          metaKey = false,
          action,
          preventDefault = true
        } = shortcut

        if (
          e.key.toLowerCase() === key.toLowerCase() &&
          e.ctrlKey === ctrlKey &&
          e.shiftKey === shiftKey &&
          e.altKey === altKey &&
          e.metaKey === metaKey
        ) {
          if (preventDefault) {
            e.preventDefault()
          }
          action()
          break
        }
      }

      // Show help with Ctrl+?
      if ((e.ctrlKey || e.metaKey) && e.key === '?' && showHelp) {
        e.preventDefault()
        setHelpVisible(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [shortcuts, enabled, showHelp])

  if (!showHelp) return null

  return (
    <>
      {helpVisible && (
        <div className="modal-backdrop z-50 flex items-center justify-center">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-text-primary">
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setHelpVisible(false)}
                className="text-text-tertiary hover:text-text-secondary"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">
                    {shortcut.description}
                  </span>
                  <kbd className="bg-surface-secondary text-xs px-2 py-1 rounded">
                    {[
                      shortcut.ctrlKey && 'Ctrl',
                      shortcut.metaKey && 'Cmd',
                      shortcut.altKey && 'Alt', 
                      shortcut.shiftKey && 'Shift',
                      shortcut.key.toUpperCase()
                    ].filter(Boolean).join(' + ')}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Utility function to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export default {
  AutoFocusManager,
  useAutoSave,
  AutoSaveIndicator,
  KeyboardShortcutManager
}


