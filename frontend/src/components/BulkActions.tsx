import { useState } from 'react';
import type { FormEvent } from 'react';
import type { BulkAction } from '../api/highlights';
import type { Tag } from '../api/types';
import { plural } from '../lib/format';
import ColorPicker from './ColorPicker';

interface Props {
  count: number;
  tags: Tag[];
  busy: boolean;
  onApply: (action: BulkAction) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

/** Toolbar shown while some highlights are selected. */
export default function BulkActions({ count, tags, busy, onApply, onSelectAll, onClear }: Props) {
  const [tag, setTag] = useState('');

  function addTag(event: FormEvent) {
    event.preventDefault();
    const name = tag.trim();
    if (!name) return;
    onApply({ add_tags: [name] });
    setTag('');
  }

  return (
    <div className="bulk-actions" role="region" aria-label="Bulk actions">
      <strong>{plural(count, 'highlight')} selected</strong>
      <button type="button" className="button-link small" onClick={onSelectAll}>
        Select all loaded
      </button>
      <form className="bulk-tag" onSubmit={addTag}>
        <input
          aria-label="Tag to add"
          placeholder="Add a tag"
          list="bulk-tag-suggestions"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        <datalist id="bulk-tag-suggestions">
          {tags.map((t) => (
            <option key={t.id} value={t.name} />
          ))}
        </datalist>
        <button type="submit" className="button small" disabled={busy || !tag.trim()}>
          Add tag
        </button>
      </form>
      <select
        aria-label="Tag to remove"
        value=""
        disabled={busy}
        onChange={(e) => e.target.value && onApply({ remove_tags: [e.target.value] })}
      >
        <option value="">Remove a tag…</option>
        {tags.map((t) => (
          <option key={t.id} value={t.name}>
            #{t.name}
          </option>
        ))}
      </select>
      <ColorPicker size="small" onChange={(color) => !busy && onApply({ color })} />
      <span className="spacer" />
      <button
        type="button"
        className="button small danger"
        disabled={busy}
        onClick={() => {
          if (window.confirm(`Delete ${plural(count, 'highlight')}? This cannot be undone.`)) {
            onApply({ delete: true });
          }
        }}
      >
        Delete
      </button>
      <button type="button" className="button-link small" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}
