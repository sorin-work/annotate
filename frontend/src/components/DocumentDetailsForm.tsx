import { useState } from 'react';
import type { FormEvent } from 'react';
import type { DocumentDetail } from '../api/types';
import ErrorMessage from './ErrorMessage';

export interface DocumentDetails {
  title: string;
  author: string | null;
  source_url: string | null;
}

interface Props {
  document: DocumentDetail;
  onSubmit: (details: DocumentDetails) => Promise<unknown>;
  onCancel: () => void;
}

export default function DocumentDetailsForm({ document, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(document.title);
  const [author, setAuthor] = useState(document.author ?? '');
  const [sourceUrl, setSourceUrl] = useState(document.source_url ?? '');
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        author: author.trim() || null,
        source_url: sourceUrl.trim() || null,
      });
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>Title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={300} />
      </label>
      <label className="field">
        <span>Author</span>
        <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={200} />
      </label>
      <label className="field">
        <span>Source URL</span>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://"
        />
      </label>
      <ErrorMessage error={error} />
      <div className="form-actions">
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button primary" disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
