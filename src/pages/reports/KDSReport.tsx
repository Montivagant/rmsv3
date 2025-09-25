import { useMemo, useState } from 'react';
import { useEventStore } from '../../events/hooks';

type Row = {
  at: number;
  orderId: string;
  status: 'preparing' | 'ready' | 'served';
  userRole: string;
  branchId?: string;
  deviceId?: string;
};

export default function KDSReport() {
  const store = useEventStore();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [q, setQ] = useState('');

  const rows = useMemo<Row[]>(() => {
    const events = store.getAll();
    const fromTs = from ? Date.parse(from) : -Infinity;
    const toTs = to ? Date.parse(to) : Infinity;
    const list: Row[] = [];
    for (const e of events) {
      if (e.type !== 'kds.status.changed') continue;
      if (e.at < fromTs || e.at > toTs) continue;
      const p: any = e.payload || {};
      if (status !== 'ALL' && p.status !== status) continue;
      list.push({
        at: e.at,
        orderId: p.orderId,
        status: p.status,
        userRole: p.by,
        branchId: p.branchId,
        deviceId: p.deviceId,
      });
    }
    return list
      .filter(r => !q || r.orderId.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.at - a.at);
  }, [store, from, to, status, q]);

  const summary = useMemo(() => {
    const totals = { preparing: 0, ready: 0, served: 0 } as Record<string, number>;
    for (const r of rows) totals[r.status] = (totals[r.status] || 0) + 1;
    return totals;
  }, [rows]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">KDS Activity Report</h1>
        <div className="text-sm">
          <span className="mr-4">Preparing: <b>{summary.preparing || 0}</b></span>
          <span className="mr-4">Ready: <b>{summary.ready || 0}</b></span>
          <span>Served: <b>{summary.served || 0}</b></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-sm mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-base border p-2 rounded w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-base border p-2 rounded w-full" />
        </div>
        <div>
          <label className="block text-sm mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="input-base border p-2 rounded w-full">
            <option>ALL</option>
            <option>preparing</option>
            <option>ready</option>
            <option>served</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Search Order</label>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Order ID" className="input-base border p-2 rounded w-full" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Order</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">User Role</th>
              <th className="py-2 pr-4">Branch</th>
              <th className="py-2 pr-4">Device</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="py-4 text-muted-foreground" colSpan={6}>No activity</td>
              </tr>
            ) : rows.map((r, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-2 pr-4">{new Date(r.at).toLocaleString()}</td>
                <td className="py-2 pr-4 font-mono">{r.orderId}</td>
                <td className="py-2 pr-4 capitalize">{r.status}</td>
                <td className="py-2 pr-4">{r.userRole}</td>
                <td className="py-2 pr-4">{r.branchId || '—'}</td>
                <td className="py-2 pr-4">{r.deviceId || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



