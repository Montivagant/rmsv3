import { useMemo, useState } from 'react';
import { useEventStore } from '../../events/context';
import type { Event } from '../../events/types';

export default function ShiftsReport() {
  const store = useEventStore();
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [branch, setBranch] = useState<string>('all');

  const rows = useMemo(() => {
    const events = store.getAll();
    const starts = events.filter(e => e.type === 'shift.started');
    const ends = events.filter(e => e.type === 'shift.ended');

    const matchEnd = (s: Event) =>
      ends.find(e => e.payload?.userId === s.payload?.userId && e.payload?.startedAt === s.payload?.startedAt);

    const fromTs = from ? Date.parse(from) : -Infinity;
    const toTs = to ? Date.parse(to) : Infinity;

    return starts
      .map(s => {
        const end = matchEnd(s);
        const startedAt = s.payload?.startedAt as number;
        const endedAt = (end?.payload?.endedAt as number) || undefined;
        const durationMs = endedAt ? Math.max(0, endedAt - startedAt) : undefined;
        return {
          userName: s.payload?.userName as string,
          userId: s.payload?.userId as string,
          startedAt,
          endedAt,
          durationMs,
          branchId: (s.payload as any)?.branchId as string | undefined,
          deviceId: (s.payload as any)?.deviceId as string | undefined,
        };
      })
      .filter(r => r.startedAt >= fromTs && r.startedAt <= toTs)
      .filter(r => branch === 'all' || r.branchId === branch)
      .sort((a, b) => b.startedAt - a.startedAt);
  }, [store, from, to, branch]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Shifts Report</h1>
      <div className="flex items-end gap-3 mb-4">
        <div>
          <label className="block text-sm mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-base border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-base border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">Branch</label>
          <select value={branch} onChange={e => setBranch(e.target.value)} className="input-base border p-2 rounded">
            <option value="all">All</option>
            <option value="main-restaurant">Main</option>
            <option value="downtown">Downtown</option>
            <option value="mall">Shopping Mall</option>
            <option value="airport">Airport</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Branch</th>
              <th className="py-2 pr-4">Device</th>
              <th className="py-2 pr-4">Start</th>
              <th className="py-2 pr-4">End</th>
              <th className="py-2 pr-4">Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="py-4 text-muted-foreground" colSpan={6}>No shifts in selected range</td>
              </tr>
            ) : rows.map((r, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-2 pr-4">{r.userName}</td>
                <td className="py-2 pr-4">{r.branchId || '—'}</td>
                <td className="py-2 pr-4">{r.deviceId || '—'}</td>
                <td className="py-2 pr-4">{new Date(r.startedAt).toLocaleString()}</td>
                <td className="py-2 pr-4">{r.endedAt ? new Date(r.endedAt).toLocaleString() : '—'}</td>
                <td className="py-2 pr-4">{r.durationMs ? Math.round(r.durationMs / 60000) + ' min' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


