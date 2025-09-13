import React, { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';
import { useDismissableLayer } from '../hooks/useDismissableLayer';

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  disabled?: boolean;
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  className?: string;
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

const DropdownMenu = ({ 
  trigger, 
  children, 
  align = 'start', 
  side = 'bottom',
  className,
  disabled = false 
}: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuIdRef = useRef<string>(`dropdown-menu-${Math.random().toString(36).slice(2)}`);
  const { layerRef } = useDismissableLayer({
    isOpen,
    onDismiss: () => setIsOpen(false),
    closeOnOutside: true,
    closeOnEscape: true,
    closeOnRouteChange: true,
    triggerRef
  });

  // No pixel positioning; rely on anchored placement with relative wrapper

  // Dismiss behavior handled by useDismissableLayer

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])');
      if (!menuItems || menuItems.length === 0) return;

      const currentIndex = Array.from(menuItems).findIndex(
        item => item === document.activeElement
      );

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          const nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
          (menuItems[nextIndex] as HTMLElement).focus();
          break;
        case 'ArrowUp':
          event.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
          (menuItems[prevIndex] as HTMLElement).focus();
          break;
        case 'Home':
          event.preventDefault();
          (menuItems[0] as HTMLElement).focus();
          break;
        case 'End':
          event.preventDefault();
          (menuItems[menuItems.length - 1] as HTMLElement).focus();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus first item when opened
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstItem = menuRef.current.querySelector('[role="menuitem"]:not([disabled])') as HTMLElement;
      if (firstItem) {
        firstItem.focus();
      }
    }
  }, [isOpen]);

  const handleTriggerClick = () => {
    if (disabled) return;
    // Using anchored absolute positioning via CSS; no JS positioning needed
    setIsOpen(!isOpen);
  };

  const menu = isOpen ? (
    <div
      ref={(node) => { menuRef.current = node; (layerRef as any).current = node; }}
      className={cn(
        'z-dropdown min-w-[12rem] rounded-lg border border-border bg-surface shadow-lg',
        'absolute mt-2',
        'py-2 animate-fade-in',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        align === 'end' && 'right-0',
        align === 'start' && 'left-0',
        side === 'top' && 'bottom-full',
        side === 'bottom' && 'top-full',
        side === 'left' && 'right-full',
        side === 'right' && 'left-full',
        className
      )}
      id={menuIdRef.current}
      role="menu"
      aria-orientation="vertical"
    >
      {children}
    </div>
  ) : null;

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
      setTimeout(() => {
        const items = menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])');
        if (items && items.length) {
          (items[items.length - 1] as HTMLElement).focus();
        }
      }, 0);
    }
  };

  // Dev-only: warn about duplicate buttons with the same accessible label
  useEffect(() => {
    // Avoid in tests; only in dev browser
    const env = (import.meta as any).env?.MODE || ((import.meta as any).env?.DEV ? 'development' : 'production');
    const isDev = typeof window !== 'undefined' && env === 'development';
    if (!isOpen || !isDev) return;
    try {
      const nodes = Array.from(document.querySelectorAll('button, [role="button"]')) as HTMLElement[];
      const map = new Map<string, number>();
      nodes.forEach((el) => {
        const label = (el.getAttribute('aria-label') || el.textContent || '').trim();
        if (!label) return;
        map.set(label, (map.get(label) || 0) + 1);
      });
      map.forEach((count, label) => {
        if (count > 1) {
          // eslint-disable-next-line no-console
          console.warn(`[a11y:dup-buttons] Found ${count} buttons with label "${label}" on the page.`);
        }
      });
    } catch {
      // ignore
    }
  }, [isOpen]);

  // Render trigger: enhance interactive element directly to avoid nesting
  let triggerNode: React.ReactNode;
  if (React.isValidElement(trigger)) {
    const original = trigger as React.ReactElement<any>;
    const origOnClick = original.props.onClick as ((e: any) => void) | undefined;
    const origOnKeyDown = original.props.onKeyDown as ((e: any) => void) | undefined;
    triggerNode = React.cloneElement(original, {
      ref: (node: HTMLElement) => {
        const r: any = (original as any).ref;
        if (typeof r === 'function') r(node);
        (triggerRef as any).current = node;
      },
      onClick: (e: any) => {
        origOnClick?.(e);
        handleTriggerClick();
      },
      onKeyDown: (e: any) => {
        origOnKeyDown?.(e);
        handleTriggerKeyDown(e);
      },
      'aria-haspopup': 'menu',
      'aria-expanded': isOpen,
      'aria-controls': isOpen ? menuIdRef.current : undefined,
      'aria-disabled': disabled,
    });
  } else {
    triggerNode = (
      <div
        ref={triggerRef}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuIdRef.current : undefined}
        aria-disabled={disabled}
        className={cn(disabled && 'opacity-50 cursor-not-allowed')}
      >
        {trigger}
      </div>
    );
  }

  return (
    <>
      {triggerNode}
      {menu && createPortal(menu, document.body)}
    </>
  );
};

const DropdownMenuItem = ({ 
  children, 
  onClick, 
  disabled = false, 
  destructive = false,
  className 
}: DropdownMenuItemProps) => {
  const handleClick = () => {
    if (disabled) return;
    onClick?.();
  };

  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'w-full px-3 py-2 text-left text-body',
        'hover:bg-surface-secondary focus:bg-surface-secondary',
        'focus:outline-none transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        destructive ? 'text-error hover:bg-error/10 focus:bg-error/10' : 'text-text-primary',
        className
      )}
    >
      {children}
    </button>
  );
};

const DropdownMenuSeparator = ({ className }: DropdownMenuSeparatorProps) => (
  <div
    role="separator"
    className={cn('my-1 h-px bg-border-secondary', className)}
  />
);

export { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator };
export type { DropdownMenuProps, DropdownMenuItemProps };
