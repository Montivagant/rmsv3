import { useMemo, useState } from 'react';
import { useEventStore } from '../../events/context';

type LogRow = {
  when: number;
  type: string;
  userName?: string;
  userId?: string;
  action?: string;
  resource?: string;
  details?: string;
};

export default function ActivityLog() {
  const store = useEventStore();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filter, setFilter] = useState('');

  const rows = useMemo<LogRow[]>(() => {
    const events = store.getAll();
    const fromTs = from ? Date.parse(from) : -Infinity;
    const toTs = to ? Date.parse(to) : Infinity;

    const logs: LogRow[] = events.map(e => {
      if (e.type === 'audit.logged') {
        const p: any = e.payload || {};
        const log: LogRow = {
          when: e.at,
          type: e.type,
        };
        if (p.userName) log.userName = p.userName;
        if (p.userId) log.userId = p.userId;
        if (p.action) log.action = p.action;
        if (p.resource) log.resource = p.resource;
        if (p.details) log.details = JSON.stringify(p.details);
        return log;
      }

      const log: LogRow = {
        when: e.at,
        type: e.type,
      };

      if (e.aggregate) {
        log.details = `${e.aggregate.type}:${e.aggregate.id}`;
      }

      return log;
    });

    const filtered = logs
      .filter(r => r.when >= fromTs && r.when <= toTs)
      .filter(r => !filter || r.type.includes(filter) || (r.action && r.action.includes(filter)) || (r.resource && r.resource.includes(filter)));

    return filtered.sort((a, b) => b.when - a.when);
  }, [store, from, to, filter]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Activity Log</h1>
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
          <label className="block text-sm mb-1">Filter</label>
          <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="type/action/resource" className="input-base border p-2 rounded" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Action</th>
              <th className="py-2 pr-4">Resource</th>
              <th className="py-2 pr-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="py-4 text-muted-foreground" colSpan={6}>No activity</td>
              </tr>
            ) : rows.map((r, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-2 pr-4">{new Date(r.when).toLocaleString()}</td>
                <td className="py-2 pr-4">{r.type}</td>
              <td className="py-2 pr-4">{r.userName || r.userId || '-'}</td>
                <td className="py-2 pr-4">{r.action || '-'}</td>
                <td className="py-2 pr-4">{r.resource || '-'}</td>
                <td className="py-2 pr-4 truncate max-w-[320px]" title={r.details}>{r.details || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


