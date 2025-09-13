import React from 'react';
import { Badge } from '../../Badge';
import type { CountStatus } from '../../../inventory/audit/types';

interface AuditStatusBadgeProps {
  status: CountStatus;
  className?: string;
}

export function AuditStatusBadge({ status, className }: AuditStatusBadgeProps) {
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
      variant: 'destructive' as const,
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
