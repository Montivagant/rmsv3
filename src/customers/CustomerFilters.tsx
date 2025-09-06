import React, { useMemo, useState } from 'react';
import { Button, Input, Select, Label } from '../components';
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
  const [minSpend, maxSpend] = useMemo<[string, string]>(() => {
    const min = filters.spend?.[0] != null ? String(filters.spend?.[0]) : '';
    const max = filters.spend?.[1] != null ? String(filters.spend?.[1]) : '';
    return [min, max];
  }, [filters.spend]);

  const [tagsText, setTagsText] = useState(() => (filters.tags || []).join(', '));

  const hasAnyFilter =
    (filters.status && filters.status.length > 0) ||
    (filters.tags && filters.tags.length > 0) ||
    (filters.spend && (filters.spend[0] != null || filters.spend[1] != null)) ||
    !!filters.visitRecency;

  const updateSpend = (which: 'min' | 'max', value: string) => {
    const current: [number | null, number | null] = [
      filters.spend?.[0] ?? null,
      filters.spend?.[1] ?? null,
    ];
    const parsed = value.trim() === '' ? null : Number(value);
    if (which === 'min') current[0] = Number.isFinite(parsed as number) ? (parsed as number) : null;
    if (which === 'max') current[1] = Number.isFinite(parsed as number) ? (parsed as number) : null;
    if (current[0] == null && current[1] == null) {
      const { spend, ...rest } = filters;
      onChange(rest);
    } else {
      onChange({ ...filters, spend: current });
    }
  };

  const updateStatus = (status: 'active' | 'inactive', checked: boolean) => {
    const current = new Set(filters.status || []);
    if (checked) current.add(status);
    else current.delete(status);
    const arr = Array.from(current);
    if (arr.length === 0) {
      const { status: _s, ...rest } = filters;
      onChange(rest);
    } else {
      onChange({ ...filters, status: arr as any });
    }
  };

  const applyTags = () => {
    const values = tagsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (values.length === 0) {
      const { tags, ...rest } = filters;
      onChange(rest);
    } else {
      onChange({ ...filters, tags: values });
    }
  };

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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="block text-sm font-medium">Status</Label>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-blue-600"
                checked={(filters.status || []).includes('active')}
                onChange={(e) => updateStatus('active', e.target.checked)}
              />
              <span className="text-sm">Active</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="accent-blue-600"
                checked={(filters.status || []).includes('inactive')}
                onChange={(e) => updateStatus('inactive', e.target.checked)}
              />
              <span className="text-sm">Inactive</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="block text-sm font-medium">Spend range ($)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Min"
              value={minSpend}
              onChange={(e) => updateSpend('min', e.target.value)}
            />
            <Input
              type="number"
              inputMode="decimal"
              placeholder="Max"
              value={maxSpend}
              onChange={(e) => updateSpend('max', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="block text-sm font-medium">Visit recency</Label>
          <Select
            value={filters.visitRecency || ''}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                const { visitRecency, ...rest } = filters;
                onChange(rest);
              } else {
                onChange({ ...filters, visitRecency: v });
              }
            }}
            placeholder="Any time"
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: '365d', label: 'Last 1 year' },
            ]}
          />
        </div>

        <div className="space-y-2">
          <Label className="block text-sm font-medium">Tags (comma separated)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="vip, newsletter"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              onBlur={applyTags}
            />
            <Button variant="outline" onClick={applyTags}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
