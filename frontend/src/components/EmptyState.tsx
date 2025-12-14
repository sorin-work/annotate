import type { ReactNode } from 'react';

export default function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      {children && <div className="muted">{children}</div>}
    </div>
  );
}
