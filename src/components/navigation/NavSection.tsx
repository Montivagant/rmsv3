import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { NavItem as NavItemType } from '../../config/nav.config';
import { NavItem } from './NavItem';

interface NavSectionProps {
  item: NavItemType;
  collapsed?: boolean;
  expandedSections?: Set<string>;
  onToggleSection?: (sectionId: string) => void;
  className?: string;
}

export const NavSection: React.FC<NavSectionProps> = ({
  item,
  collapsed = false,
  expandedSections = new Set(),
  onToggleSection,
  className = '',
}) => {
  const location = useLocation();
  const isExpanded = expandedSections.has(item.id);
  
  // Check if current path matches any child
  const hasActiveChild = item.children?.some(child => 
    child.path === location.pathname || 
    (child.path && location.pathname.startsWith(child.path + '/'))
  ) ?? false;

  // Auto-expand sections with active children
  useEffect(() => {
    if (hasActiveChild && !isExpanded && onToggleSection) {
      onToggleSection(item.id);
    }
  }, [hasActiveChild, isExpanded, item.id, onToggleSection]);

  // If section has no children, render as single nav item
  if (!item.children || item.children.length === 0) {
    return (
      <NavItem
        item={item}
        collapsed={collapsed}
        className={className}
      />
    );
  }

  // Render expandable section
  return (
    <div className={`space-y-1 ${className}`}>
      {/* Section header */}
      <NavItem
        item={item}
        collapsed={collapsed}
        isActive={hasActiveChild}
        onClick={collapsed ? undefined : () => onToggleSection?.(item.id)}
      />

      {/* Section content */}
      {!collapsed && isExpanded && (
        <div
          id={`nav-section-${item.id}`}
          className="ml-8 space-y-1"
          role="group"
          aria-labelledby={`nav-section-header-${item.id}`}
        >
          {item.children.map(child => (
            <NavItem
              key={child.id}
              item={child}
              collapsed={collapsed}
              depth={1}
              className="relative before:absolute before:left-0 before:top-3 before:w-2 before:h-px before:bg-border-secondary"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NavSection;
