/**
 * Performance Monitor Component
 * 
 * Displays real-time performance metrics for the optimized event store
 * Helps track cache hit rates, query performance, and memory usage
 */

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

interface PerformanceMetrics {
  queriesExecuted: number;
  cacheHits: number;
  cacheMisses: number;
  averageQueryTime: number;
  indexUsage: Record<string, number>;
}

interface PerformanceMonitorProps {
  getMetrics: () => PerformanceMetrics;
  className?: string;
  refreshInterval?: number;
}

export function PerformanceMonitor({ 
  getMetrics, 
  className = '', 
  refreshInterval = 2000 
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    queriesExecuted: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageQueryTime: 0,
    indexUsage: {}
  });
  
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateMetrics = () => {
      try {
        const newMetrics = getMetrics();
        setMetrics(newMetrics);
      } catch (error) {
        console.warn('Failed to get performance metrics:', error);
      }
    };

    // Initial load
    updateMetrics();

    // Set up refresh interval
    const interval = setInterval(updateMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [getMetrics, refreshInterval]);

  const calculateCacheHitRate = () => {
    const total = metrics.cacheHits + metrics.cacheMisses;
    return total > 0 ? ((metrics.cacheHits / total) * 100).toFixed(1) : '0.0';
  };

  const getPerformanceColor = (hitRate: number) => {
    if (hitRate >= 80) return 'text-green-600';
    if (hitRate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatQueryTime = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const hitRate = parseFloat(calculateCacheHitRate());

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className={`fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors ${className}`}
        title="Show Performance Monitor"
      >
        📊 Perf
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 w-80 ${className}`}>
      <Card className="bg-white/95 backdrop-blur-sm border shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              ⚡ Performance Monitor
            </CardTitle>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700 text-sm"
              title="Hide Performance Monitor"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3 text-sm">
          {/* Cache Performance */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium">Cache Hit Rate</span>
              <span className={`font-mono ${getPerformanceColor(hitRate)}`}>
                {calculateCacheHitRate()}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  hitRate >= 80 ? 'bg-green-500' : 
                  hitRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${hitRate}%` }}
              ></div>
            </div>
          </div>

          {/* Query Statistics */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-gray-600">Total Queries</div>
              <div className="font-mono font-medium">{metrics.queriesExecuted.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Avg Query Time</div>
              <div className="font-mono font-medium">{formatQueryTime(metrics.averageQueryTime)}</div>
            </div>
            <div>
              <div className="text-gray-600">Cache Hits</div>
              <div className="font-mono font-medium text-green-600">{metrics.cacheHits.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-600">Cache Misses</div>
              <div className="font-mono font-medium text-red-600">{metrics.cacheMisses.toLocaleString()}</div>
            </div>
          </div>

          {/* Index Usage */}
          {Object.keys(metrics.indexUsage).length > 0 && (
            <div>
              <div className="text-gray-600 font-medium mb-1">Index Usage</div>
              <div className="space-y-1">
                {Object.entries(metrics.indexUsage).map(([index, count]) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-gray-600">{index}</span>
                    <span className="font-mono">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Indicators */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  hitRate >= 80 ? 'bg-green-500' : 
                  hitRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-gray-600">
                  {hitRate >= 80 ? 'Excellent' : 
                   hitRate >= 60 ? 'Good' : 'Poor'} Performance
                </span>
              </div>
              
              {metrics.averageQueryTime < 5 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">Fast Queries</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Compact Performance Badge for Status Bar
 */
interface PerformanceBadgeProps {
  getMetrics: () => PerformanceMetrics;
  className?: string;
}

export function PerformanceBadge({ getMetrics, className = '' }: PerformanceBadgeProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    queriesExecuted: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageQueryTime: 0,
    indexUsage: {}
  });

  useEffect(() => {
    const updateMetrics = () => {
      try {
        const newMetrics = getMetrics();
        setMetrics(newMetrics);
      } catch (error) {
        // Silently fail for badge
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Less frequent for badge

    return () => clearInterval(interval);
  }, [getMetrics]);

  const total = metrics.cacheHits + metrics.cacheMisses;
  const hitRate = total > 0 ? (metrics.cacheHits / total) * 100 : 0;

  const getStatusColor = () => {
    if (hitRate >= 80) return 'text-green-600';
    if (hitRate >= 60) return 'text-yellow-600';
    if (total > 0) return 'text-red-600';
    return 'text-gray-400';
  };

  const getStatusIcon = () => {
    if (hitRate >= 80) return '⚡';
    if (hitRate >= 60) return '🔋';
    if (total > 0) return '🐌';
    return '📊';
  };

  return (
    <div 
      className={`flex items-center gap-1 text-xs ${getStatusColor()} ${className}`}
      title={`Cache Hit Rate: ${hitRate.toFixed(1)}% | Avg Query: ${metrics.averageQueryTime.toFixed(1)}ms | Queries: ${metrics.queriesExecuted}`}
    >
      <span>{getStatusIcon()}</span>
      <span className="font-mono">{hitRate.toFixed(0)}%</span>
    </div>
  );
}
