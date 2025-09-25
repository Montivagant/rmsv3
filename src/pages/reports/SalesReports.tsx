import { useMemo, useState } from 'react';
import { useEventStore } from '../../events/hooks';
import { useApi } from '../../hooks/useApi';

type Row = {
  ticketId: string;
  at: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  customerId?: string | null;
};

export default function SalesReports() {
  const store = useEventStore();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data: customers = [] } = useApi<any[]>('/api/customers', [] as any);
  const [search, setSearch] = useState('');

  const customerMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of (customers as any[])) {
      if (c && c.id) map[c.id] = c.name || c.email || c.phone || c.id;
    }
    return map;
  }, [customers]);

  const rows = useMemo<Row[]>(() => {
    const events = store.getAll();
    const fromTs = from ? Date.parse(from) : -Infinity;
    const toTs = to ? Date.parse(to) : Infinity;

    return events
      .filter(e => e.type === 'sale.recorded')
      .map(e => {
        const p: any = e.payload || {};
        return {
          ticketId: p.ticketId,
          at: e.at,
          subtotal: p.totals?.subtotal ?? 0,
          discount: p.totals?.discount ?? 0,
          tax: p.totals?.tax ?? 0,
          total: p.totals?.total ?? 0,
          customerId: p.customerId ?? null,
        };
      })
      .filter(r => r.at >= fromTs && r.at <= toTs)
      .filter(r => {
        if (!search) return true;
        const s = search.toLowerCase();
        const cust = r.customerId ? (customerMap[r.customerId] || r.customerId) : '';
        return (
          r.ticketId?.toLowerCase().includes(s) ||
          cust.toLowerCase().includes(s)
        );
      })
      .sort((a, b) => b.at - a.at);
  }, [store, from, to, search, customerMap]);

  const summary = useMemo(() => {
    let net = 0, tax = 0, discount = 0, count = 0;
    for (const r of rows) {
      count++;
      net += r.total;
      tax += r.tax;
      discount += r.discount;
    }
    return { count, net, tax, discount };
  }, [rows]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales Reports</h1>
        <div className="text-sm">
          <div>Tickets: <span className="font-semibold">{summary.count}</span></div>
          <div>Discount: <span className="font-semibold">${summary.discount.toFixed(2)}</span></div>
          <div>Tax: <span className="font-semibold">${summary.tax.toFixed(2)}</span></div>
          <div>Net Sales: <span className="font-semibold">${summary.net.toFixed(2)}</span></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-base border p-2 rounded w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-base border p-2 rounded w-full" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Search</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ticket ID or Customer" className="input-base border p-2 rounded w-full" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Ticket</th>
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">Subtotal</th>
              <th className="py-2 pr-4">Discount</th>
              <th className="py-2 pr-4">Tax</th>
              <th className="py-2 pr-4">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="py-4 text-muted-foreground" colSpan={7}>No sales match filters</td>
              </tr>
            ) : rows.map((r, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-2 pr-4">{r.ticketId}</td>
                <td className="py-2 pr-4">{new Date(r.at).toLocaleString()}</td>
                <td className="py-2 pr-4">{r.customerId ? (customerMap[r.customerId] || r.customerId) : '—'}</td>
                <td className="py-2 pr-4">${r.subtotal.toFixed(2)}</td>
                <td className="py-2 pr-4">${r.discount.toFixed(2)}</td>
                <td className="py-2 pr-4">${r.tax.toFixed(2)}</td>
                <td className="py-2 pr-4 font-semibold">${r.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
