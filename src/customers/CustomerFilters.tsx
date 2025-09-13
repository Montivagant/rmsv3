import React, { useMemo, useState } from 'react';
import { Button, Input } from '../components';
import type { CustomerFilters } from './types';

interface Props {
  searchInput: string;
  setSearchInput: (v: string) => void;
  filters: CustomerFilters;
  onChange: (next: CustomerFilters) => void;
  onReset: () => void;
}

export function CustomerFilters({
  searchInput,
  setSearchInput,
  filters,
  onChange,
  onReset,
}: Props) {
  const hasAnyFilter = !!filters && Object.keys(filters).length > 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-center">
        <Input
          placeholder="Search customers..."
          className="max-w-md"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Search customers"
        />
        {hasAnyFilter && (
          <Button variant="outline" onClick={onReset} aria-label="Reset all filters">
            Reset
          </Button>
        )}
      </div>

      {/* Simplified: no advanced filters for now */}
    </div>
  );
}
