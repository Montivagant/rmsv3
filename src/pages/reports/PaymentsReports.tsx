import { useMemo, useState } from 'react';
import { useEventStore } from '../../events/hooks';

type Row = {
  ticketId: string;
  when: number;
  method?: string;
  amount: number;
  status: 'initiated' | 'succeeded' | 'failed';
};

export default function PaymentsReports() {
  const store = useEventStore();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const rows = useMemo<Row[]>(() => {
    const events = store.getAll();
    const fromTs = from ? Date.parse(from) : -Infinity;
    const toTs = to ? Date.parse(to) : Infinity;

    const mapped: Row[] = [];
    for (const e of events) {
      if (!e.type.startsWith('payment.')) continue;
      const p: any = e.payload || {};
      if (e.type === 'payment.initiated') {
        mapped.push({
          ticketId: p.ticketId,
          when: e.at,
          method: p.paymentMethod,
          amount: p.amount ?? 0,
          status: 'initiated',
        });
      } else if (e.type === 'payment.succeeded') {
        mapped.push({
          ticketId: p.ticketId,
          when: e.at,
          amount: p.amount ?? 0,
          status: 'succeeded',
        });
      } else if (e.type === 'payment.failed') {
        mapped.push({
          ticketId: p.ticketId,
          when: e.at,
          amount: p.amount ?? 0,
          status: 'failed',
        });
      }
    }

    return mapped
      .filter(r => r.when >= fromTs && r.when <= toTs)
      .sort((a, b) => b.when - a.when);
  }, [store, from, to]);

  const totals = useMemo(() => {
    let initiated = 0, succeeded = 0, failed = 0, amount = 0;
    for (const r of rows) {
      if (r.status === 'initiated') initiated++;
      if (r.status === 'succeeded') { succeeded++; amount += r.amount; }
      if (r.status === 'failed') failed++;
    }
    return { initiated, succeeded, failed, amount };
  }, [rows]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Payments Report</h1>
      <div className="flex items-end gap-3 mb-4">
        <div>
          <label className="block text-sm mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-base border p-2 rounded" />
        </div>
        <div>
          <label className="block text-sm mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-base border p-2 rounded" />
        </div>
        <div className="ml-auto text-sm">
          <div>Initiated: <span className="font-semibold">{totals.initiated}</span></div>
          <div>Succeeded: <span className="font-semibold">{totals.succeeded}</span></div>
          <div>Failed: <span className="font-semibold">{totals.failed}</span></div>
          <div>Amount: <span className="font-semibold">${totals.amount.toFixed(2)}</span></div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Ticket</th>
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Method</th>
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="py-4 text-muted-foreground" colSpan={5}>No payments in range</td>
              </tr>
            ) : rows.map((r, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-2 pr-4">{r.ticketId}</td>
                <td className="py-2 pr-4">{new Date(r.when).toLocaleString()}</td>
                <td className="py-2 pr-4">{r.method || '—'}</td>
                <td className="py-2 pr-4">${r.amount.toFixed(2)}</td>
                <td className="py-2 pr-4 capitalize">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


