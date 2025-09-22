import { useEffect, useState } from 'react';
import { getKdsSettings } from '../../settings/kds';
import { cn } from '../../lib/utils';

interface TicketTimerProps {
  startTime: string | Date;
  warningThreshold?: number; // minutes
  dangerThreshold?: number; // minutes
  showPulse?: boolean;
  className?: string;
}

export function TicketTimer({
  startTime,
  warningThreshold = getKdsSettings().warningThresholdMinutes,
  dangerThreshold = getKdsSettings().dangerThresholdMinutes,
  showPulse = getKdsSettings().showPulse,
  className,
}: TicketTimerProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const elapsed = Math.max(0, now - start);
      
      const minutes = Math.floor(elapsed / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      
      setElapsedMinutes(minutes);
      setElapsedSeconds(seconds);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const urgencyLevel = 
    elapsedMinutes >= dangerThreshold ? 'danger' :
    elapsedMinutes >= warningThreshold ? 'warning' :
    'normal';

  const urgencyClasses = {
    normal: 'text-muted-foreground bg-surface',
    warning: 'text-warning bg-warning/10',
    danger: 'text-error bg-error/10',
  } as const;

  const pulseClasses = {
    normal: '',
    warning: showPulse ? 'animate-pulse-subtle' : '',
    danger: showPulse ? 'animate-pulse' : '',
  };

  const formatTime = () => {
    const mins = String(elapsedMinutes).padStart(2, '0');
    const secs = String(elapsedSeconds).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        'px-2 py-1 rounded-md font-mono text-sm font-medium',
        'transition-all duration-300',
        urgencyClasses[urgencyLevel],
        pulseClasses[urgencyLevel],
        className
      )}
      role="timer"
      aria-live="polite"
      aria-label={`Order time: ${elapsedMinutes} minutes ${elapsedSeconds} seconds`}
    >
      <svg
        className="w-4 h-4 mr-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{formatTime()}</span>
    </div>
  );
}
