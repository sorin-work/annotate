import type { ReactNode } from 'react';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
