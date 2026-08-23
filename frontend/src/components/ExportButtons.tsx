import { useState } from 'react';
import type { ExportFormat } from '../api/exports';

const FORMATS: [ExportFormat, string][] = [
  ['md', 'Markdown'],
  ['csv', 'CSV'],
  ['json', 'JSON'],
];

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
      {FORMATS.map(([format, name]) => (
        <button
          key={format}
          type="button"
          className="button small"
          disabled={busy !== null}
          onClick={() => run(format)}
        >
          {busy === format ? 'Exporting…' : name}
        </button>
      ))}
      {error && <span className="error small">{error}</span>}
    </div>
  );
}
