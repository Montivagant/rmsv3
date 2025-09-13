import React, { useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi';

type ItemRow = {
  id: string;
  sku: string;
  name: string;
  current: number;
  available?: number;
  reserved?: number;
  averageCost?: number;
  value?: number;
};

export default function InventoryReports() {
  const { data, loading } = useApi<any>('/api/inventory/items?limit=500&offset=0', { items: [] } as any);
  const [minQty, setMinQty] = useState<string>('');
  const [maxQty, setMaxQty] = useState<string>('');

  const rows = useMemo<ItemRow[]>(() => {
    const items: any[] = Array.isArray(data) ? data : (data?.items ?? []);
    const min = minQty.trim() === '' ? -Infinity : Number(minQty);
    const max = maxQty.trim() === '' ? Infinity : Number(maxQty);
    const mapped: ItemRow[] = (items || []).map((it: any) => {
      const current = it.levels?.current ?? it.quantity ?? it.qty ?? 0;
      const avgCost = it.costing?.averageCost ?? it.cost ?? 0;
      return {
        id: it.id || it.sku,
        sku: it.sku || it.id,
        name: it.name || it.description || it.sku || '—',
        current,
        available: it.levels?.available,
        reserved: it.levels?.reserved,
        averageCost: avgCost,
        value: current * (avgCost || 0),
      };
    }).filter(r => r.current >= min && r.current <= max);
    return mapped.sort((a, b) => a.name.localeCompare(b.name));
  }, [data, minQty, maxQty]);

  const totals = useMemo(() => {
    let current = 0, value = 0;
    for (const r of rows) {
      current += r.current;
      value += r.value || 0;
    }
    return { current, value };
  }, [rows]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inventory Levels Report</h1>
      <div className="flex items-end gap-3 mb-4">
        <div>
          <label className="block text-sm mb-1">Min Qty</label>
          <input type="number" value={minQty} onChange={e => setMinQty(e.target.value)} className="input-base border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Max Qty</label>
          <input type="number" value={maxQty} onChange={e => setMaxQty(e.target.value)} className="input-base border p-2 rounded" />
        </div>
        <div className="ml-auto text-sm">
          <div>Total Units: <span className="font-semibold">{totals.current.toLocaleString()}</span></div>
          <div>Inventory Value: <span className="font-semibold">${(totals.value).toFixed(2)}</span></div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">SKU</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Current</th>
              <th className="py-2 pr-4">Available</th>
              <th className="py-2 pr-4">Reserved</th>
              <th className="py-2 pr-4">Avg Cost</th>
              <th className="py-2 pr-4">Value</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="py-4 text-muted-foreground" colSpan={7}>Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="py-4 text-muted-foreground" colSpan={7}>No items match filters</td>
              </tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-mono">{r.sku}</td>
                <td className="py-2 pr-4">{r.name}</td>
                <td className="py-2 pr-4">{r.current}</td>
                <td className="py-2 pr-4">{r.available ?? '—'}</td>
                <td className="py-2 pr-4">{r.reserved ?? '—'}</td>
                <td className="py-2 pr-4">{r.averageCost != null ? `$${r.averageCost.toFixed(2)}` : '—'}</td>
                <td className="py-2 pr-4">{r.value != null ? `$${(r.value).toFixed(2)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}