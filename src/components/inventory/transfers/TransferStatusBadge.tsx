import React from 'react';
import { Badge } from '../../Badge';
import type { TransferStatus } from '../../../inventory/transfers/types';
import { TransferUtils } from '../../../inventory/transfers/types';

interface TransferStatusBadgeProps {
  status: TransferStatus;
  className?: string;
}

function TransferStatusBadgeBase({ status, className }: TransferStatusBadgeProps) {
  const variant = TransferUtils.getStatusColorVariant(status);
  const label = TransferUtils.getStatusDisplayText(status);

  // Map our variants to Badge component variants
  const badgeVariant = variant === 'destructive' ? 'error' : variant;

  return (
    <Badge 
      variant={badgeVariant as any}
      className={className}
    >
      {label}
    </Badge>
  );
}

export { TransferStatusBadgeBase as TransferStatusBadge };
