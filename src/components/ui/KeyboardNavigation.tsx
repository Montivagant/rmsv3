/**
 * Advanced Keyboard Navigation and Focus Management
 * Provides comprehensive keyboard navigation patterns and focus management utilities
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '../../utils/cn'

// Roving tabindex hook for complex navigation patterns
export function useRovingTabIndex<T extends HTMLElement>(
  items: T[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both'
    loop?: boolean
    onActivateItem?: (index: number, item: T) => void
    disabled?: boolean
  } = {}
) {
  const { orientation = 'vertical', loop = true, onActivateItem, disabled = false } = options
  const [activeIndex, setActiveIndex] = useState(0)

  const handleKeyDown = useCallback((e: React.KeyboardEvent | KeyboardEvent) => {

    let newIndex = activeIndex

    switch (e.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault()
          newIndex = loop 
            ? (activeIndex + 1) % items.length 
            : Math.min(activeIndex + 1, items.length - 1)
        }
        break

      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault()
          newIndex = loop 
            ? (activeIndex - 1 + items.length) % items.length 
            : Math.max(activeIndex - 1, 0)
        }
        break

      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault()
          newIndex = loop 
            ? (activeIndex + 1) % items.length 
            : Math.min(activeIndex + 1, items.length - 1)
        }
        break

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault()
          newIndex = loop 
            ? (activeIndex - 1 + items.length) % items.length 
            : Math.max(activeIndex - 1, 0)
        }
        break

      case 'Home':
        e.preventDefault()
        newIndex = 0
        break

      case 'End':
        e.preventDefault()
        newIndex = items.length - 1
        break

      case 'Enter':
      case ' ':
        e.preventDefault()
        onActivateItem?.(activeIndex, items[activeIndex])
        break
    }

    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex)
      items[newIndex]?.focus()
    }
  }, [activeIndex, items, orientation, loop, onActivateItem, disabled])

  // Update tabindex attributes
  useEffect(() => {
    items.forEach((item, index) => {
      if (item) {
        item.tabIndex = index === activeIndex ? 0 : -1
      }
    })
  }, [items, activeIndex])

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    getItemProps: (index: number) => ({
      tabIndex: index === activeIndex ? 0 : -1,
      onKeyDown: handleKeyDown,
      onFocus: () => setActiveIndex(index)
    })
  }
}

// Advanced focus trap with customizable behavior
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    active?: boolean
    initialFocus?: 'first' | 'last' | HTMLElement | (() => HTMLElement | null)
    returnFocus?: boolean
    allowOutsideClick?: boolean
    onEscape?: () => void
  } = {}
) {
  const {
    active = true,
    initialFocus = 'first',
    returnFocus = true,
    allowOutsideClick = false,
    onEscape
  } = options

  const previousActiveElement = useRef<HTMLElement | null>(null)
  const sentinelStartRef = useRef<HTMLDivElement>(null)
  const sentinelEndRef = useRef<HTMLDivElement>(null)

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []

    const selector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ')

    return Array.from(containerRef.current.querySelectorAll(selector)) as HTMLElement[]
  }, [containerRef])

  const focusFirst = useCallback(() => {
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }
  }, [getFocusableElements])

  const focusLast = useCallback(() => {
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus()
    }
  }, [getFocusableElements])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!active || !containerRef.current) return

    if (e.key === 'Escape' && onEscape) {
      e.preventDefault()
      onEscape()
      return
    }

    if (e.key === 'Tab') {
      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) {
        e.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstElement || document.activeElement === sentinelStartRef.current) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement || document.activeElement === sentinelEndRef.current) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }
  }, [active, containerRef, getFocusableElements, onEscape])

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (!active || allowOutsideClick || !containerRef.current) return

    if (!containerRef.current.contains(e.target as Node)) {
      e.preventDefault()
      e.stopImmediatePropagation()
      
      // Return focus to container
      const focusableElements = getFocusableElements()
      if (focusableElements.length > 0) {
        focusableElements[0].focus()
      }
    }
  }, [active, allowOutsideClick, containerRef, getFocusableElements])

  // Set up focus trap when active
  useEffect(() => {
    if (!active) return

    // Save current focus
    previousActiveElement.current = document.activeElement as HTMLElement

    // Set initial focus
    if (typeof initialFocus === 'function') {
      const element = initialFocus()
      element?.focus()
    } else if (initialFocus instanceof HTMLElement) {
      initialFocus.focus()
    } else if (initialFocus === 'last') {
      focusLast()
    } else {
      focusFirst()
    }

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('mousedown', handleClickOutside, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('mousedown', handleClickOutside, true)

      // Restore focus
      if (returnFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [active, initialFocus, handleKeyDown, handleClickOutside, focusFirst, focusLast, returnFocus])

  // Focus trap sentinels
  const SentinelStart = () => (
    <div
      ref={sentinelStartRef}
      tabIndex={active ? 0 : -1}
      onFocus={focusLast}
      style={{ position: 'fixed', top: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    />
  )

  const SentinelEnd = () => (
    <div
      ref={sentinelEndRef}
      tabIndex={active ? 0 : -1}
      onFocus={focusFirst}
      style={{ position: 'fixed', bottom: 0, right: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    />
  )

  return {
    SentinelStart,
    SentinelEnd,
    focusFirst,
    focusLast,
    getFocusableElements
  }
}

// Accessible menu component with full keyboard navigation
export interface MenuOption {
  id: string
  label: string
  disabled?: boolean
  shortcut?: string
  icon?: React.ReactNode
  submenu?: MenuOption[]
  onSelect?: () => void
}

export interface AccessibleMenuProps {
  trigger: React.ReactElement
  options: MenuOption[]
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
  className?: string
  onOpenChange?: (isOpen: boolean) => void
}

export const AccessibleMenu: React.FC<AccessibleMenuProps> = ({
  trigger,
  options,
  placement = 'bottom-start',
  className = '',
  onOpenChange
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement>(null)

  const flatOptions = options.filter(option => !option.disabled)

  const { handleKeyDown: menuKeyDown } = useRovingTabIndex(
    flatOptions.map((_, index) => 
      menuRef.current?.querySelector(`[data-option-index="${index}"]`) as HTMLElement
    ).filter(Boolean),
    {
      orientation: 'vertical',
      loop: true,
      onActivateItem: (index) => {
        const option = flatOptions[index]
        if (option?.onSelect) {
          option.onSelect()
          setIsOpen(false)
        }
      }
    }
  )

  const { SentinelStart, SentinelEnd } = useFocusTrap(menuRef, {
    active: isOpen,
    onEscape: () => setIsOpen(false),
    returnFocus: true
  })

  // Handle trigger events
  const handleTriggerClick = () => {
    setIsOpen(!isOpen)
    onOpenChange?.(!isOpen)
  }

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault()
      setIsOpen(true)
      onOpenChange?.(true)
    }
  }

  // Position menu
  const placementClasses = {
    'bottom-start': 'top-full left-0',
    'bottom-end': 'top-full right-0',
    'top-start': 'bottom-full left-0',
    'top-end': 'bottom-full right-0'
  }

  return (
    <div className="relative">
      {/* Trigger */}
      {React.cloneElement(trigger, {
        ref: triggerRef,
        onClick: handleTriggerClick,
        onKeyDown: handleTriggerKeyDown,
        'aria-haspopup': 'menu',
        'aria-expanded': isOpen,
        'aria-controls': isOpen ? 'menu' : undefined
      })}

      {/* Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          id="menu"
          role="menu"
          className={cn(
            'absolute z-50 mt-1 min-w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1',
            placementClasses[placement],
            className
          )}
          onKeyDown={(e) => menuKeyDown(e.nativeEvent)}
        >
          <SentinelStart />
          
          {options.map((option, index) => (
            <div
              key={option.id}
              data-option-index={index}
              role="menuitem"
              tabIndex={-1}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors',
                option.disabled
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none'
              )}
              onClick={option.disabled ? undefined : () => {
                option.onSelect?.()
                setIsOpen(false)
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !option.disabled) {
                  e.preventDefault()
                  option.onSelect?.()
                  setIsOpen(false)
                }
              }}
              aria-disabled={option.disabled}
            >
              <div className="flex items-center space-x-2">
                {option.icon && (
                  <span className="flex-shrink-0" aria-hidden="true">
                    {option.icon}
                  </span>
                )}
                <span>{option.label}</span>
              </div>
              
              {option.shortcut && (
                <span className="text-xs text-gray-500 dark:text-gray-400" aria-label={`Keyboard shortcut: ${option.shortcut}`}>
                  {option.shortcut}
                </span>
              )}
            </div>
          ))}
          
          <SentinelEnd />
        </div>
      )}

      {/* Overlay to close menu */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false)
            onOpenChange?.(false)
          }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

// Accessible tabs component with keyboard navigation
export interface TabItem {
  id: string
  label: string
  content: React.ReactNode
  disabled?: boolean
  icon?: React.ReactNode
}

export interface AccessibleTabsProps {
  tabs: TabItem[]
  defaultTab?: string
  orientation?: 'horizontal' | 'vertical'
  className?: string
  onTabChange?: (tabId: string) => void
}

export const AccessibleTabs: React.FC<AccessibleTabsProps> = ({
  tabs,
  defaultTab,
  orientation = 'horizontal',
  className = '',
  onTabChange
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
  const tabsRef = useRef<HTMLDivElement>(null)

  const enabledTabs = tabs.filter(tab => !tab.disabled)
  const activeTabIndex = enabledTabs.findIndex(tab => tab.id === activeTab)
  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  const { handleKeyDown } = useRovingTabIndex(
    enabledTabs.map((_, index) => 
      tabsRef.current?.querySelector(`[data-tab-index="${index}"]`) as HTMLElement
    ).filter(Boolean),
    {
      orientation,
      loop: true,
      onActivateItem: (index) => {
        const tab = enabledTabs[index]
        if (tab) {
          setActiveTab(tab.id)
          onTabChange?.(tab.id)
        }
      }
    }
  )

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
    onTabChange?.(tabId)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tab List */}
      <div
        ref={tabsRef}
        role="tablist"
        aria-orientation={orientation}
        className={cn(
          'flex border-b border-gray-200 dark:border-gray-700',
          orientation === 'vertical' ? 'flex-col border-b-0 border-r' : 'flex-row'
        )}
        onKeyDown={(e) => handleKeyDown(e.nativeEvent)}
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab
          const enabledIndex = enabledTabs.findIndex(t => t.id === tab.id)
          
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              data-tab-index={enabledIndex >= 0 ? enabledIndex : undefined}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              disabled={tab.disabled}
              className={cn(
                'flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                orientation === 'vertical' && 'border-b-0 border-r-2 justify-start',
                isActive
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
                tab.disabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !tab.disabled && handleTabClick(tab.id)}
            >
              {tab.icon && (
                <span aria-hidden="true">{tab.icon}</span>
              )}
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      {tabs.map((tab) => (
        <div
          key={`panel-${tab.id}`}
          id={`panel-${tab.id}`}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== activeTab}
          className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
        >
          {tab.id === activeTab && tab.content}
        </div>
      ))}
    </div>
  )
}

export default {
  useRovingTabIndex,
  useFocusTrap,
  AccessibleMenu,
  AccessibleTabs
}