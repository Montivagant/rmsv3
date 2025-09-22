import { cn } from '../../lib/utils';

type StickyBarProps = {
  visible: boolean;
  onSave: () => void;
  onReset?: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  resetDisabled?: boolean;
  className?: string;
};

export default function StickyBar({
  visible,
  onSave,
  onReset,
  saving = false,
  saveDisabled = false,
  resetDisabled = false,
  className,
}: StickyBarProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-sticky',
        'bg-surface/95 backdrop-blur border-t border-primary',
        'px-4 py-3',
        className
      )}
      role="region"
      aria-label="Pending changes actions"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="text-body-sm text-secondary">
          You have unsaved changes
        </div>
        <div className="flex items-center gap-2">
          {onReset && (
            <button
              type="button"
              className={cn('btn-base btn-outline')}
              onClick={onReset}
              disabled={resetDisabled || saving}
            >
              Reset
            </button>
          )}
          <button
            type="button"
            className={cn('btn-base btn-primary min-w-[6rem]')}
            onClick={onSave}
            disabled={saveDisabled || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
