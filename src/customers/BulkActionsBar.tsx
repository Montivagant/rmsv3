import { Button } from '../components';

interface Props {
  count: number;
  onExportCSV: () => void;
  onAddTag: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onClear: () => void;
}

export function BulkActionsBar({
  count,
  onExportCSV,
  onAddTag,
  onActivate,
  onDeactivate,
  onClear,
}: Props) {
  const hidden = count <= 0;
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      aria-hidden={hidden}
      className={
        hidden
          ? 'hidden'
          : 'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-elevated/95 backdrop-blur supports-[backdrop-filter]:bg-surface-elevated/80'
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-sm text-text-secondary">
          {count.toLocaleString()} selected
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onExportCSV} aria-label="Export selected customers to CSV">
            Export CSV
          </Button>
          <Button variant="outline" onClick={onAddTag} aria-label="Add tag to selected customers">
            Add Tag
          </Button>
          <Button variant="outline" onClick={onActivate} aria-label="Activate selected customers">
            Activate
          </Button>
          <Button variant="outline" onClick={onDeactivate} aria-label="Deactivate selected customers">
            Deactivate
          </Button>
          <Button variant="ghost" onClick={onClear} aria-label="Clear selection">
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BulkActionsBar;
