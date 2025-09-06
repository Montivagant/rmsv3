import React, { useState, useRef, useEffect } from 'react';

interface ActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionItem[];
  trigger?: React.ReactNode;
  label?: string;
  position?: 'left' | 'right';
  className?: string;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  trigger,
  label = 'Actions',
  position = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-secondary btn-sm flex items-center space-x-2 focus-ring"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <span>{label}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {isOpen && (
        <div
          className={`
            absolute mt-2 w-56 bg-surface rounded-lg shadow-lg 
            border border-secondary z-dropdown
            ${position === 'left' ? 'left-0' : 'right-0'}
          `}
          role="menu"
          aria-orientation="vertical"
          onKeyDown={handleKeyDown}
        >
          <div className="py-1">
            {items.map((item, index) => (
              <button
                key={item.id}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                disabled={item.disabled}
                className={`
                  w-full flex items-center space-x-3 px-4 py-2 text-sm text-left
                  transition-colors focus:outline-none focus:bg-surface-secondary
                  ${item.disabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-surface-secondary cursor-pointer'
                  }
                  ${item.variant === 'danger' 
                    ? 'text-error-600 dark:text-error-400' 
                    : 'text-secondary'
                  }
                  ${index === 0 ? 'rounded-t-lg' : ''}
                  ${index === items.length - 1 ? 'rounded-b-lg' : ''}
                `}
                role="menuitem"
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
