import React from 'react';
import type { BadgeData } from '../../config/nav.config';
import { useBadgeData } from '../../hooks/useNavigationBadges';

interface NavigationBadgeProps {
  badgeId: string;
  className?: string;
}

export const NavigationBadge: React.FC<NavigationBadgeProps> = ({ badgeId, className = '' }) => {
  const badgeData = useBadgeData(badgeId);

  if (!badgeData || badgeData.count === 0) {
    return null;
  }

  const getVariantClasses = (variant: BadgeData['variant']): string => {
    switch (variant) {
      case 'danger':
        return 'bg-error-100 text-error-700 dark:bg-error-500/20 dark:text-error-400';
      case 'warning':
        return 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400';
      case 'success':
        return 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400';
      case 'default':
      default:
        return 'bg-brand-100 text-brand-800 dark:bg-brand-500/20 dark:text-brand-300';
    }
  };

  const displayCount = badgeData.count > 99 ? '99+' : badgeData.count.toString();

  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[1.25rem] h-5 px-1.5
        text-xs font-medium
        rounded-full
        transition-colors duration-200
        ${getVariantClasses(badgeData.variant)}
        ${className}
      `}
      aria-label={`${badgeData.count} notifications`}
    >
      {displayCount}
    </span>
  );
};

export default NavigationBadge;
