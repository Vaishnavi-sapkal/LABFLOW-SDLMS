import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

export function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 print:static print:bg-transparent print:p-0" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="presentation">
      <section aria-modal="true" className="w-full max-w-md rounded-card bg-white shadow-card print:max-w-none print:shadow-none" role="dialog">
        <header className="flex items-center justify-between border-b border-border px-5 py-4 print:hidden">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button aria-label="Close" className="grid h-8 w-8 place-items-center rounded-ui text-ink-muted hover:bg-surface-muted" onClick={onClose} type="button"><X size={18} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}
