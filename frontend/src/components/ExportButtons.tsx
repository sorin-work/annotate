import { useState } from 'react';
import type { ExportFormat } from '../api/exports';

interface Props {
  onExport: (format: ExportFormat) => Promise<void>;
  label?: string;
}

export default function ExportButtons({ onExport, label = 'Export' }: Props) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(format: ExportFormat) {
    setBusy(format);
    setError(null);
    try {
      await onExport(format);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="export-buttons" role="group" aria-label={label}>
      <span className="muted small">{label}</span>
      <button
        type="button"
        className="button small"
        disabled={busy !== null}
        onClick={() => run('md')}
      >
        {busy === 'md' ? 'Exporting…' : 'Markdown'}
      </button>
      <button
        type="button"
        className="button small"
        disabled={busy !== null}
        onClick={() => run('csv')}
      >
        {busy === 'csv' ? 'Exporting…' : 'CSV'}
      </button>
      {error && <span className="error small">{error}</span>}
    </div>
  );
}
