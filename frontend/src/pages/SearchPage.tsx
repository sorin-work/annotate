import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { searchApi } from '../api/search';
import ErrorMessage from '../components/ErrorMessage';
import HighlightCard from '../components/HighlightCard';
import PageHeader from '../components/PageHeader';
import { plural } from '../lib/format';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [draft, setDraft] = useState(q);
  const [lastQ, setLastQ] = useState(q);

  // Keep the box in sync when the search comes from the top bar.
  if (q !== lastQ) {
    setLastQ(q);
    setDraft(q);
  }

  const { data, isFetching, error } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchApi.search({ q }),
    enabled: q.trim().length > 0,
    placeholderData: keepPreviousData,
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setParams(draft.trim() ? { q: draft.trim() } : {});
  }

  const nothing = data && data.documents.length === 0 && data.highlights.length === 0;

  return (
    <>
      <PageHeader title="Search" subtitle="Across document text, highlights, notes and tags." />
      <form className="toolbar" role="search" onSubmit={onSubmit}>
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What are you looking for?"
          aria-label="Search query"
          autoFocus
        />
        <button type="submit" className="button primary">
          Search
        </button>
        {isFetching && <span className="muted small">Searching…</span>}
      </form>
      <ErrorMessage error={error} />

      {nothing && <p className="muted">Nothing found for “{q}”.</p>}

      {data && data.documents.length > 0 && (
        <section className="search-section">
          <h2>{plural(data.documents.length, 'document')}</h2>
          <ul className="search-documents">
            {data.documents.map((d) => (
              <li key={d.id}>
                <Link to={`/documents/${d.id}`}>
                  <strong>{d.title}</strong>
                </Link>
                {d.author && <span className="muted"> · {d.author}</span>}
                <p className="muted small">{d.snippet}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && data.highlights.length > 0 && (
        <section className="search-section">
          <h2>{plural(data.highlights.length, 'highlight')}</h2>
          <div className="highlight-list">
            {data.highlights.map((h) => (
              <HighlightCard key={h.id} highlight={h} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
