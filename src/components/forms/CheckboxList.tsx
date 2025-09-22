
export interface CheckboxItem {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface CheckboxListProps {
  items: CheckboxItem[];
  selectedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
  className?: string;
  maxHeight?: number; // in rem units, default 10rem
}

export function CheckboxList({ items, selectedIds, onToggle, className = '', maxHeight = 10 }: CheckboxListProps) {
  return (
    <div
      className={`space-y-2 overflow-y-auto p-2 rounded border border-border bg-surface ${className}`}
      style={{ maxHeight: `${maxHeight}rem` }}
      role="group"
    >
      {items.length === 0 ? (
        <p className="text-sm text-text-tertiary">No items available</p>
      ) : (
        items.map((item) => {
          const inputId = `checkbox-${item.id}`;
          const checked = selectedIds.includes(item.id);
          return (
            <div key={item.id} className="flex items-center gap-3">
              <input
                id={inputId}
                type="checkbox"
                className="rounded border-border text-brand focus:ring-brand"
                checked={checked}
                onChange={(e) => onToggle(item.id, e.currentTarget.checked)}
                disabled={item.disabled}
              />
              <div className="flex-1">
                <label htmlFor={inputId} className="text-sm text-text-primary cursor-pointer">
                  {item.label}
                </label>
                {item.description && (
                  <p className="text-xs text-text-tertiary">{item.description}</p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default CheckboxList;

