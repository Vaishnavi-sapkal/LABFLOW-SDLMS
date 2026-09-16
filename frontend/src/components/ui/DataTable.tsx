import type { ReactNode } from 'react';

export function DataTable({ columns, children }: { columns: string[]; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-white">
      <div aria-label="Scrollable table" className="overflow-x-auto overscroll-x-contain">
        <table className="min-w-[600px] border-collapse text-left text-[13px]">
          <thead className="bg-surface-muted text-xs font-semibold uppercase tracking-normal text-ink-muted">
            <tr>{columns.map((column) => <th className="whitespace-nowrap border-b border-border px-3 py-3 sm:px-4" key={column}>{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border text-ink">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function DataCell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-3 py-3 align-middle sm:px-4 ${className}`}>{children}</td>;
}
