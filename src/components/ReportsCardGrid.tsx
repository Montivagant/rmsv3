import React from 'react';
import { Link } from 'react-router-dom';
import { NavIcon } from './navigation/NavIcon';

interface ReportCard {
  id: string;
  title: string;
  description?: string;
  path: string;
  icon?: string;
  comingSoon?: boolean;
}

interface ReportsCardGridProps {
  title: string;
  description?: string;
  cards: ReportCard[];
  className?: string;
}

const ReportCardComponent: React.FC<{ card: ReportCard }> = ({ card }) => {
  const cardContent = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {card.title}
          </h3>
          {card.description && (
            <p className="text-sm text-text-secondary mb-4">
              {card.description}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 ml-4">
          {card.icon && (
            <NavIcon path={card.icon} className="w-5 h-5 text-text-tertiary" />
          )}
          <svg 
            className="w-4 h-4 text-text-tertiary" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 5l7 7-7 7" 
            />
          </svg>
        </div>
      </div>
      {card.comingSoon && (
        <div className="mt-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800 dark:bg-warning-500/20 dark:text-warning-400">
            Coming Soon
          </span>
        </div>
      )}
    </>
  );

  if (card.comingSoon) {
    return (
      <div
        className="
          block p-6 
          bg-surface border border-border-primary rounded-lg shadow-sm
          opacity-60 cursor-not-allowed
          transition-all duration-200
        "
        aria-disabled="true"
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      to={card.path}
      className="
        block p-6 
        bg-surface border border-border-primary rounded-lg shadow-sm
        hover:shadow-md hover:border-border-focus hover:scale-[1.02]
        focus-ring
        transition-all duration-200
        group
      "
      aria-describedby={card.description ? `${card.id}-description` : undefined}
    >
      {cardContent}
    </Link>
  );
};

export const ReportsCardGrid: React.FC<ReportsCardGridProps> = ({
  title,
  description,
  cards,
  className = '',
}) => {
  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">{title}</h1>
        {description && (
          <p className="text-lg text-text-secondary max-w-3xl">{description}</p>
        )}
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map(card => (
          <ReportCardComponent key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
};

export default ReportsCardGrid;
