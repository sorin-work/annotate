import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function normaliseTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ').toLowerCase();
}

export default function TagInput({ value, onChange, suggestions = [], placeholder }: Props) {
  const [draft, setDraft] = useState('');
  const listId = useId();

  function add(raw: string) {
    const names = raw.split(',').map(normaliseTag).filter(Boolean);
    const next = [...value];
    for (const name of names) if (!next.includes(name)) next.push(name);
    if (next.length !== value.length) onChange(next);
    setDraft('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (draft.trim()) add(draft);
    } else if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  const available = suggestions.filter((s) => !value.includes(s));

  return (
    <div className="tag-input">
      {value.map((tag) => (
        <span key={tag} className="tag">
          #{tag}
          <button
            type="button"
            aria-label={`Remove tag ${tag}`}
            onClick={() => onChange(value.filter((t) => t !== tag))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        list={available.length ? listId : undefined}
        placeholder={value.length ? '' : (placeholder ?? 'Add tags')}
        aria-label="Add tag"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && add(draft)}
      />
      {available.length > 0 && (
        <datalist id={listId}>
          {available.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}
