import { useState, useEffect } from 'react';
import { useSyncStatus, useNetworkStatus, type SyncState } from '../db/syncManager';

interface SyncStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncStatusIndicator({ className = '', showDetails = false }: SyncStatusIndicatorProps) {
  const [syncStatus, setSyncStatus] = useState<SyncState>('idle');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [statusInfo, setStatusInfo] = useState<any>(null);

  const syncManager = useSyncStatus();
  const networkManager = useNetworkStatus();

  useEffect(() => {
    const unsubscribeSync = syncManager.subscribe((state, info) => {
      setSyncStatus(state);
      setStatusInfo(info);
    });
    
    const unsubscribeNetwork = networkManager.subscribe(setIsOnline);

    return () => {
      unsubscribeSync();
      unsubscribeNetwork();
    };
  }, []);

  const getStatusIcon = () => {
    if (!isOnline) return '📴';
    
    switch (syncStatus) {
      case 'active': return '🔄';
      case 'error': return '❌';
      case 'offline': return '📴';
      case 'unavailable': return '⚪';
      case 'paused': return '⏸️';
      default: return '⚪';
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-orange-600';
    
    switch (syncStatus) {
      case 'active': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'offline': return 'text-orange-600';
      case 'unavailable': return 'text-gray-400';
      case 'paused': return 'text-yellow-600';
      default: return 'text-gray-400';
    }
  };

  const getTooltip = () => {
    if (!isOnline) return 'Network offline';
    
    switch (syncStatus) {
      case 'active': return 'Syncing with CouchDB';
      case 'error': return `Sync error${statusInfo?.error ? ': ' + statusInfo.error : ''}`;
      case 'offline': return 'Sync paused (offline)';
      case 'unavailable': return 'Sync not available';
      case 'paused': return 'Sync paused';
      case 'idle': return 'Sync ready';
      default: return 'Sync status unknown';
    }
  };

  if (showDetails) {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <span className={getStatusColor()}>
          {getStatusIcon()}
        </span>
        <div className="flex flex-col">
          <span className={`text-xs ${getStatusColor()}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <span className="text-xs text-gray-500">
            Sync: {syncStatus}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center ${className}`}
      title={getTooltip()}
    >
      <span className={`text-lg ${getStatusColor()}`}>
        {getStatusIcon()}
      </span>
    </div>
  );
}

// Compact version for status bars
export function SyncStatusBadge({ className = '' }: { className?: string }) {
  return (
    <SyncStatusIndicator 
      className={className} 
      showDetails={false}
    />
  );
}

// Detailed version for settings panels
export function SyncStatusPanel({ className = '' }: { className?: string }) {
  return (
    <SyncStatusIndicator 
      className={className} 
      showDetails={true}
    />
  );
}
