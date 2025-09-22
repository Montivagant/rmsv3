import type { CustomerStatus } from './types';

export function StatusPill({ status }: { status?: CustomerStatus }) {
  const isActive = (status || 'active') === 'active';
  const classes = isActive
    ? 'bg-success text-success border border-success'
    : 'bg-surface-secondary text-secondary border border-secondary';
  const label = isActive ? 'Active' : 'Inactive';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}
      aria-label={`Status: ${label}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? 'bg-success' : 'bg-muted'}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
