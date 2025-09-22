import { Badge } from '../../Badge';
import type { CountStatus } from '../../../inventory/counts/types';

interface CountStatusBadgeProps {
  status: CountStatus;
  className?: string;
}

export function CountStatusBadge({ status, className }: CountStatusBadgeProps) {
  const statusConfig = {
    draft: {
      variant: 'secondary' as const,
      label: 'Draft'
    },
    open: {
      variant: 'warning' as const, 
      label: 'In Progress'
    },
    closed: {
      variant: 'success' as const,
      label: 'Completed'
    },
    cancelled: {
      variant: 'error' as const,
      label: 'Cancelled'
    }
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge 
      variant={config.variant}
      className={className}
    >
      {config.label}
    </Badge>
  );
}
