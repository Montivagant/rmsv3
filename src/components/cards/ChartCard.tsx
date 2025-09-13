import React from 'react';

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  type?: 'bar' | 'line' | 'pie' | 'area';
  data?: ChartDataPoint[];
  action?: {
    label: string;
    onClick: () => void;
  };
  loading?: boolean;
  height?: number;
  className?: string;
  children?: React.ReactNode; // For custom chart implementations
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  type = 'bar',
  data = [],
  action,
  loading = false,
  height = 200,
  className = '',
  children,
}) => {
  if (loading) {
    return (
      <div className={`card p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-2">
              <div className="h-5 bg-surface-secondary rounded w-32"></div>
              {subtitle && <div className="h-3 bg-surface-secondary rounded w-48"></div>}
            </div>
            {action && <div className="h-4 bg-surface-secondary rounded w-20"></div>}
          </div>
          <div className="bg-surface-secondary rounded h-52"></div>
        </div>
      </div>
    );
  }

  // Simple bar chart implementation (can be replaced with a proper charting library)
  const renderSimpleBarChart = () => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div className="flex items-end justify-between space-x-2 h-52">
        {data.map((point, index) => {
          const heightPercentage = (point.value / maxValue) * 100;
          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center justify-end"
            >
              <span className="text-xs font-medium text-primary mb-1">
                {point.value}
              </span>
              <div
                className="w-full bg-primary-500 dark:bg-primary-600 rounded-t transition-all duration-300 hover:bg-primary-600 dark:hover:bg-primary-500 h-[--bar-h]"
                style={{ ['--bar-h' as any]: `${heightPercentage}%` }}
                title={`${point.label}: ${point.value}`}
              />
              <span className="text-xs text-tertiary mt-2 truncate w-full text-center">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Simple line chart implementation
  const renderSimpleLineChart = () => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d.value));
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - (point.value / maxValue) * 100;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <div className="relative h-52">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary-500 dark:text-primary-400"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={`0,100 ${points} 100,100`}
            fill="currentColor"
            fillOpacity="0.1"
            className="text-primary-500 dark:text-primary-400"
          />
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between">
          {data.map((point, index) => (
            <span key={index} className="text-xs text-tertiary">
              {point.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Simple pie chart implementation
  const renderSimplePieChart = () => {
    if (!data || data.length === 0) return null;
    
    const total = data.reduce((sum, point) => sum + point.value, 0);
    let currentAngle = -90; // Start from top

    // Token-based color classes for slices (no hardcoded hex)
    const pieColorClasses = [
      'text-brand-500',
      'text-success-500',
      'text-warning-500',
      'text-error-500',
      'text-brand-700',
      'text-brand-400',
    ] as const;
    
    const slices = data.map((point, index) => {
      const percentage = (point.value / total) * 100;
      const angle = (percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      const startX = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
      const startY = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
      const endX = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
      const endY = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
      
      const colorClass = pieColorClasses[index % pieColorClasses.length];
      
      return (
        <g key={index}>
          <path
            d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
            fill="currentColor"
            className={`hover:opacity-80 transition-opacity ${colorClass}`}
          />
          <title>{`${point.label}: ${point.value} (${percentage.toFixed(1)}%)`}</title>
        </g>
      );
    });
    
    return (
      <div className="flex items-center justify-center h-52">
        <svg className="w-full h-full max-w-xs" viewBox="0 0 100 100">
          {slices}
        </svg>
      </div>
    );
  };

  const renderChart = () => {
    if (children) return children;
    
    switch (type) {
      case 'line':
        return renderSimpleLineChart();
      case 'pie':
        return renderSimplePieChart();
      case 'bar':
      default:
        return renderSimpleBarChart();
    }
  };

  return (
    <div className={`card p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-primary">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-secondary mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium focus-ring rounded px-1"
          >
            {action.label}
          </button>
        )}
      </div>

      {data.length === 0 && !children ? (
        <div className="flex items-center justify-center h-52">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto text-tertiary mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-sm text-secondary">
              No data available
            </p>
          </div>
        </div>
      ) : (
        renderChart()
      )}

      {/* Legend for pie charts */}
      {type === 'pie' && data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-secondary">
          <div className="grid grid-cols-2 gap-2">
            {data.map((point, index) => {
              const pieColorClasses = [
                'text-brand-500',
                'text-success-500',
                'text-warning-500',
                'text-error-500',
                'text-brand-700',
                'text-brand-400',
              ] as const;
              const colorClass = pieColorClasses[index % pieColorClasses.length];
              return (
                <div key={index} className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                  <span className="text-xs text-secondary truncate">
                    {point.label}: {point.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartCard;
