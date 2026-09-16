import type { ReactNode } from 'react';

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="w-full px-3 py-4 sm:px-4 sm:py-6 lg:px-6">{children}</div>;
}
