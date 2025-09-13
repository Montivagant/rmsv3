import { useMemo, useState } from 'react';
import { useEventStore } from '../../events/context';

type Row = {
  type: 'void' | 'return';
  ticketId: string;
  at: number;
  reason?: string;
  total?: number;
};

export default function VoidsReturnsReport() {
  const store = useEventStore();
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const rows = useMemo(() => {
    const events = store.getAll();
    const voids = events.filter(e => e.type === 'sale.voided');
    const rets = events.filter(e => e.type === 'sale.returned');

    const fromTs = from ? Date.parse(from) : -Infinity;
    const toTs = to ? Date.parse(to) : Infinity;

    const mapped: Row[] = [
      ...voids.map(e => ({
        type: 'void' as const,
        ticketId: (e as any).payload?.ticketId,
        at: e.at,
        reason: (e as any).payload?.reason,
      })),
      ...rets.map(e => ({
        type: 'return' as const,
        ticketId: (e as any).payload?.ticketId,
        at: e.at,
        reason: (e as any).payload?.reason,
        total: (e as any).payload?.totals?.total,
      })),
    ];

    return mapped
      .filter(r => r.at >= fromTs && r.at <= toTs)
      .sort((a, b) => b.at - a.at);
  }, [store, from, to]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Voids & Returns</h1>
      <div className="flex items-end gap-3 mb-4">
        <div>
          <label className="block text-sm mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-base border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-base border p-2 rounded" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Ticket</th>
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="py-4 text-muted-foreground" colSpan={5}>No rows in selected range</td>
              </tr>
            ) : rows.map((r, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-2 pr-4">{r.type === 'void' ? 'Void' : 'Return'}</td>
                <td className="py-2 pr-4">{r.ticketId}</td>
                <td className="py-2 pr-4">{new Date(r.at).toLocaleString()}</td>
                <td className="py-2 pr-4">{r.type === 'return' ? (r.total ?? 0).toFixed(2) : '—'}</td>
                <td className="py-2 pr-4">{r.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


