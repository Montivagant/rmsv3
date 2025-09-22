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
  const badgeVariant = variant as 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';

  return (
    <Badge 
      variant={badgeVariant}
      className={className}
    >
      {label}
    </Badge>
  );
}

export { TransferStatusBadgeBase as TransferStatusBadge };
