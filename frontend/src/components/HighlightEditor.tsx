import { useState } from 'react';
import type { HighlightChanges } from '../api/highlights';
import type { Highlight } from '../api/types';
import { timeAgo } from '../lib/format';
import ColorPicker from './ColorPicker';
import TagInput from './TagInput';

interface Props {
  highlight: Highlight;
  active: boolean;
  tagSuggestions: string[];
  onActivate: () => void;
  onSave: (changes: HighlightChanges) => Promise<unknown>;
  onDelete: () => void;
  /** Focus the note field when the editor opens (off when stepping through with j/k). */
  autoFocus?: boolean;
}

/** A highlight in the document sidebar: compact by default, editable when active. */
export default function HighlightEditor({
  highlight,
  active,
  tagSuggestions,
  onActivate,
  onSave,
  onDelete,
  autoFocus = true,
}: Props) {
  const [note, setNote] = useState(highlight.note ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = note.trim() !== (highlight.note ?? '');

  async function save(changes: HighlightChanges) {
    setSaving(true);
    try {
      await onSave(changes);
    } finally {
      setSaving(false);
    }
  }

  if (!active) {
    return (
      <button
        type="button"
        className={`sidebar-highlight border-${highlight.color}`}
        onClick={onActivate}
        id={`highlight-${highlight.id}`}
      >
        <span className="quote">{highlight.quote}</span>
        {highlight.note && <span className="note">{highlight.note}</span>}
        {highlight.tags.length > 0 && (
          <span className="tags">
            {highlight.tags.map((t) => (
              <span key={t} className="tag">
                #{t}
              </span>
            ))}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={`sidebar-highlight active border-${highlight.color}`}
      id={`highlight-${highlight.id}`}
    >
      <span className="quote">{highlight.quote}</span>
      <label className="field">
        <span className="sr-only">Note</span>
        <textarea
          value={note}
          rows={4}
          placeholder="Why does this matter?"
          onChange={(e) => setNote(e.target.value)}
          autoFocus={autoFocus}
        />
      </label>
      <TagInput
        value={highlight.tags}
        suggestions={tagSuggestions}
        onChange={(tags) => save({ tags })}
      />
      <div className="sidebar-highlight-actions">
        <ColorPicker size="small" value={highlight.color} onChange={(color) => save({ color })} />
        <span className="spacer" />
        <button type="button" className="button-link danger" onClick={onDelete}>
          Delete
        </button>
        <button
          type="button"
          className="button primary small"
          disabled={!dirty || saving}
          onClick={() => save({ note })}
        >
          {saving ? 'Saving…' : 'Save note'}
        </button>
      </div>
      <span className="muted small">Highlighted {timeAgo(highlight.created_at)}</span>
    </div>
  );
}
