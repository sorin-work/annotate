import type { ReactNode } from 'react';
import { useDocumentTitle } from '../lib/useDocumentTitle';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Tab title, when `title` isn't plain text. */
  documentTitle?: string;
}

export default function PageHeader({ title, subtitle, actions, documentTitle }: Props) {
  useDocumentTitle(documentTitle ?? (typeof title === 'string' ? title : null));
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
