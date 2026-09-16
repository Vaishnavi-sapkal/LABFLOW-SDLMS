import { Check } from 'lucide-react';

export function StepTracker({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
      {steps.map((step, index) => {
        const complete = index < activeIndex;
        const active = index === activeIndex;
        return (
          <div className="flex min-w-0 items-center gap-2 rounded-ui border border-border bg-white p-2.5 sm:gap-3 sm:p-3" key={step}>
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${complete ? 'bg-success text-white' : active ? 'bg-brand-600 text-white' : 'bg-surface-muted text-ink-muted'}`}>
              {complete ? <Check size={15} /> : index + 1}
            </span>
            <span className={`truncate text-xs sm:text-sm ${active ? 'font-semibold text-ink' : 'text-ink-muted'}`}>{step}</span>
          </div>
        );
      })}
    </div>
  );
}
