import { cn } from '@labflow/utils/cn';

export function Tabs<T extends string>({ items, value, onChange }: { items: T[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="flex max-w-full overflow-x-auto rounded-ui border border-border bg-surface-muted p-1">
      {items.map((item) => (
        <button className={cn('h-8 shrink-0 rounded-md px-2.5 text-xs font-semibold transition sm:px-3 sm:text-sm', value === item ? 'bg-white text-brand-700 shadow-card' : 'text-ink-muted hover:text-ink')} key={item} onClick={() => onChange(item)} type="button">
          {item}
        </button>
      ))}
    </div>
  );
}
