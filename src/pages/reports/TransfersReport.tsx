import { useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import type { TransfersResponse, Location, Transfer } from '../../inventory/transfers/types';

function sumPlanned(lines: Transfer['lines']): number {
  return (lines || []).reduce((acc, l) => acc + (l.qtyPlanned || 0), 0);
}
function sumFinal(lines: Transfer['lines']): number {
  return (lines || []).reduce((acc, l) => acc + (l.qtyFinal || 0), 0);
}

export default function TransfersReport() {
  const [status, setStatus] = useState<Transfer['status'] | 'ALL'>('ALL');
  const [source, setSource] = useState('');
  const [dest, setDest] = useState('');
  const [search, setSearch] = useState('');

  const queryParams: any = useMemo(() => {
    const p: any = { page: 1, pageSize: 50 };
    if (status !== 'ALL') p.status = status;
    if (source) p.sourceLocationId = source;
    if (dest) p.destinationLocationId = dest;
    if (search) p.search = search;
    return p;
  }, [status, source, dest, search]);

  const searchParams = new URLSearchParams();
  Object.entries(queryParams).forEach(([k, v]) => {
    if (v != null && v !== '') searchParams.set(k, String(v));
  });
  const transfersUrl = `/api/inventory/transfers?${searchParams.toString()}`;
  const { data: resp, loading } = useApi<TransfersResponse>(transfersUrl);
  const { data: locations } = useApi<Location[]>('/api/inventory/locations', [] as any);
  const locationList = locations ?? [];

  const rows = useMemo(() => resp?.data || [], [resp?.data]);

  const totals = useMemo(() => {
    let sent = 0, received = 0, variance = 0;
    for (const t of rows) {
      const s = sumPlanned(t.lines);
      const r = sumFinal(t.lines);
      sent += s; received += r; variance += (r - s);
    }
    return { sent, received, variance };
  }, [rows]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Transfers Report</h1>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        <div>
          <label className="block text-sm mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as any)} className="input-base border p-2 rounded">
            <option value="ALL">All</option>
            <option value="DRAFT">Draft</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Source</label>
          <select value={source} onChange={e => setSource(e.target.value)} className="input-base border p-2 rounded">
            <option value="">Any</option>
            {locationList.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Destination</label>
          <select value={dest} onChange={e => setDest(e.target.value)} className="input-base border p-2 rounded">
            <option value="">Any</option>
            {locationList.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm mb-1">Search</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Code, note, item name/SKU" className="input-base border p-2 rounded w-full" />
        </div>
      </div>

      <div className="mb-3 text-sm">
        <span className="mr-4">Sent: <span className="font-semibold">{totals.sent}</span></span>
        <span className="mr-4">Received: <span className="font-semibold">{totals.received}</span></span>
        <span>Variance: <span className="font-semibold">{totals.variance}</span></span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Source</th>
              <th className="py-2 pr-4">Destination</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Sent Qty</th>
              <th className="py-2 pr-4">Received Qty</th>
              <th className="py-2 pr-4">Variance</th>
              <th className="py-2 pr-4">Lines</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="py-4 text-muted-foreground" colSpan={8}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="py-4 text-muted-foreground" colSpan={8}>No transfers found</td></tr>
            ) : rows.map(t => {
              const s = sumPlanned(t.lines);
              const r = sumFinal(t.lines);
              return (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-mono">{t.code}</td>
                  <td className="py-2 pr-4">{locationList.find(l => l.id === t.sourceLocationId)?.name || t.sourceLocationId}</td>
                  <td className="py-2 pr-4">{locationList.find(l => l.id === t.destinationLocationId)?.name || t.destinationLocationId}</td>
                  <td className="py-2 pr-4">{t.status}</td>
                  <td className="py-2 pr-4">{s}</td>
                  <td className="py-2 pr-4">{t.status === 'COMPLETED' ? r : '—'}</td>
                  <td className="py-2 pr-4">{t.status === 'COMPLETED' ? (r - s) : '—'}</td>
                  <td className="py-2 pr-4">{t.lines?.length ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


