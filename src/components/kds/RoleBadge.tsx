import { cn } from '../../lib/utils';
import { Role } from '../../rbac/roles';

interface RoleBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function RoleBadge({ className, size = 'md' }: RoleBadgeProps) {
  // Get the authenticated user's role from live auth/session state

  // Display Business Owner for all users since that's our only role
  const displayRole = 'Business Owner';

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  } as const;

  const roleColors: Record<string, string> = {
    [Role.BUSINESS_OWNER]: 'bg-warning/20 text-warning border-warning/20',
    'Business Owner': 'bg-warning/20 text-warning border-warning/20',
    Unknown: 'bg-surface-secondary text-text-secondary border-border',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md font-medium border',
        sizeClasses[size],
        roleColors[displayRole] || roleColors[Role.BUSINESS_OWNER],
        className
      )}
      role="status"
      aria-label={`Current role: ${displayRole}`}
    >
      <span className="tracking-wider">{displayRole}</span>
    </div>
  );
}