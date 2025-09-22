/**
 * Search results display component with navigation and keyboard support
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SearchResult } from '../../shared/searchService';

export interface SearchResults {
  query: string;
  results: SearchResult[];
  totalCount: number;
  searchTime: number;
}

interface SearchResultsProps {
  results: SearchResults;
  loading: boolean;
  onResultClick?: (result: SearchResult) => void;
  onClose?: () => void;
  className?: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  loading,
  onResultClick,
  onClose,
  className = ''
}) => {
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
    itemRefs.current = [];
  }, [results.results]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!results.results.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < results.results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (results.results[selectedIndex]) {
            handleResultClick(results.results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results.results, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  const handleResultClick = (result: SearchResult) => {
    onResultClick?.(result);
    navigate(result.url);
    onClose?.();
  };

  const renderIcon = (iconPath: string) => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
    </svg>
  );

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'customer':
        return 'text-blue-600 bg-blue-50';
      case 'menu_item':
        return 'text-green-600 bg-green-50';
      case 'inventory_item':
        return 'text-orange-600 bg-orange-50';
      case 'order':
        return 'text-purple-600 bg-purple-50';
      case 'report':
        return 'text-indigo-600 bg-indigo-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'customer':
        return 'Customer';
      case 'menu_item':
        return 'Menu';
      case 'inventory_item':
        return 'Inventory';
      case 'order':
        return 'Order';
      case 'report':
        return 'Page';
      default:
        return 'Item';
    }
  };

  if (loading) {
    return (
      <div className={`bg-surface rounded-lg shadow-lg border border-border-secondary p-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
          <span className="ml-2 text-sm text-secondary">Searching...</span>
        </div>
      </div>
    );
  }

  if (!results.query) {
    return (
      <div className={`bg-surface rounded-lg shadow-lg border border-border-secondary p-4 ${className}`}>
        <div className="text-center py-8">
          <div className="text-secondary mb-2">
            {renderIcon('M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z')}
          </div>
          <p className="text-sm text-secondary">Start typing to search...</p>
          <p className="text-xs text-tertiary mt-1">
            Search customers, menu items, inventory, orders, and more
          </p>
        </div>
      </div>
    );
  }

  if (results.results.length === 0) {
    return (
      <div className={`bg-surface rounded-lg shadow-lg border border-border-secondary p-4 ${className}`}>
        <div className="text-center py-8">
          <div className="text-secondary mb-2">
            {renderIcon('M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')}
          </div>
          <p className="text-sm text-primary">No results found for "{results.query}"</p>
          <p className="text-xs text-secondary mt-1">
            Try different keywords or check spelling
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-lg shadow-lg border border-border-secondary ${className}`}>
      {/* Results header */}
      <div className="px-4 py-3 border-b border-border-secondary">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-primary">
            {results.totalCount} result{results.totalCount !== 1 ? 's' : ''} for "{results.query}"
          </p>
          <p className="text-xs text-tertiary">
            {results.searchTime}ms
          </p>
        </div>
      </div>

      {/* Results list */}
      <div
        ref={resultsRef}
        className="max-h-96 overflow-y-auto"
        role="listbox"
        aria-label="Search results"
      >
        {results.results.map((result, index) => (
          <button
            key={`${result.type}-${result.id}`}
            ref={el => { itemRefs.current[index] = el; }}
            onClick={() => handleResultClick(result)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`w-full px-4 py-3 text-left hover:bg-surface-secondary transition-colors border-b border-border-tertiary last:border-b-0 ${
              index === selectedIndex ? 'bg-surface-secondary' : ''
            }`}
            role="option"
            aria-selected={index === selectedIndex}
          >
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className={`p-2 rounded-lg ${getTypeColor(result.type)}`}>
                {renderIcon(result.icon)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-primary truncate">
                    {result.title}
                  </h4>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(result.type)}`}>
                    {getTypeLabel(result.type)}
                  </span>
                </div>
                <p className="text-sm text-secondary truncate mt-1">
                  {result.subtitle}
                </p>
                {result.description && (
                  <p className="text-xs text-tertiary mt-1 line-clamp-2">
                    {result.description}
                  </p>
                )}

                {/* Special metadata for certain types */}
                {result.metadata && (
                  <div className="flex items-center space-x-2 mt-2">
                    {result.metadata.isLowStock && (
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium text-error bg-error/10">
                        Low Stock
                      </span>
                    )}
                    {result.metadata.status && (
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        result.metadata.status === 'completed' ? 'text-success bg-success/10' :
                        result.metadata.status === 'preparing' ? 'text-warning bg-warning/10' :
                        result.metadata.status === 'ready' ? 'text-info bg-info/10' :
                        'text-error bg-error/10'
                      }`}>
                        {result.metadata.status}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Arrow indicator for selected item */}
              {index === selectedIndex && (
                <div className="text-primary">
                  {renderIcon('M9 5l7 7-7 7')}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Footer with keyboard hints */}
      <div className="px-4 py-2 border-t border-border-secondary bg-surface-secondary/50">
        <p className="text-xs text-tertiary">
          <kbd className="px-1 py-0.5 text-xs bg-surface border border-border-secondary rounded">↑↓</kbd>
          {' '}to navigate •{' '}
          <kbd className="px-1 py-0.5 text-xs bg-surface border border-border-secondary rounded">Enter</kbd>
          {' '}to select •{' '}
          <kbd className="px-1 py-0.5 text-xs bg-surface border border-border-secondary rounded">Esc</kbd>
          {' '}to close
        </p>
      </div>
    </div>
  );
};

export default SearchResults;
