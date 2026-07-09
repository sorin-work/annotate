import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { collectionsApi } from '../api/collections';
import { documentsApi } from '../api/documents';
import type { DocumentSort, ReadingStatus } from '../api/documents';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import PageHeader from '../components/PageHeader';
import ProgressBar from '../components/ProgressBar';
import { plural, readingTime, timeAgo } from '../lib/format';
import { parseId, parsePage } from '../lib/params';
import { useDebouncedValue } from '../lib/useDebouncedValue';

const PAGE_SIZE = 20;
const STATUSES: { value: ReadingStatus; label: string }[] = [
  { value: 'unread', label: 'Not started' },
  { value: 'reading', label: 'Reading' },
  { value: 'finished', label: 'Finished' },
];

export default function LibraryPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const sort = (params.get('sort') as DocumentSort | null) ?? 'recent';
  const collectionId = parseId(params.get('collection'));
  const statusParam = params.get('status');
  const status = STATUSES.find((s) => s.value === statusParam)?.value ?? null;
  const page = parsePage(params.get('page'));
  // Typing in the filter updates the url right away but only queries once it settles.
  const search = useDebouncedValue(q.trim(), 250);

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.list,
  });
  const { data, isPending, error } = useQuery({
    queryKey: ['documents', { q: search, sort, collectionId, status, page }],
    queryFn: () =>
      documentsApi.list({
        q: search,
        sort,
        collectionId,
        status,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  }

  const pages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;
  const filtered = Boolean(q || collectionId || status);

  return (
    <>
      <PageHeader
        title="Library"
        subtitle={data ? plural(data.total, 'document') : undefined}
        actions={
          <Link className="button primary" to="/documents/new">
            Add document
          </Link>
        }
      />

      <div className="toolbar">
        <input
          type="search"
          placeholder="Filter by title or author"
          aria-label="Filter documents"
          value={q}
          onChange={(e) => update('q', e.target.value)}
        />
        <select
          aria-label="Collection"
          value={collectionId ?? ''}
          onChange={(e) => update('collection', e.target.value)}
        >
          <option value="">All collections</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Reading status"
          value={status ?? ''}
          onChange={(e) => update('status', e.target.value)}
        >
          <option value="">Any progress</option>
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => update('sort', e.target.value)}>
          <option value="recent">Recently read</option>
          <option value="created">Recently added</option>
          <option value="title">Title</option>
        </select>
      </div>

      <ErrorMessage error={error} />
      {isPending && <p className="muted">Loading…</p>}

      {data && data.items.length === 0 && (
        <EmptyState title={filtered ? 'No matching documents' : 'Your library is empty'}>
          {filtered ? (
            'Try a different filter.'
          ) : (
            <>
              <Link to="/documents/new">Add your first document</Link>: paste some text or upload a
              Markdown, text or PDF file.
            </>
          )}
        </EmptyState>
      )}

      <ul className="document-list">
        {data?.items.map((doc) => (
          <li key={doc.id}>
            <Link to={`/documents/${doc.id}`} className="document-card">
              <div className="document-card-header">
                <h2>{doc.title}</h2>
                <span className={`badge badge-${doc.source_type}`}>{doc.source_type}</span>
              </div>
              {doc.author && <p className="author">{doc.author}</p>}
              <p className="excerpt">{doc.excerpt}</p>
              <p className="meta muted small">
                {plural(doc.highlight_count, 'highlight')} · {readingTime(doc.word_count)} ·{' '}
                {doc.last_opened_at
                  ? `opened ${timeAgo(doc.last_opened_at)}`
                  : `added ${timeAgo(doc.created_at)}`}
                {doc.reading_progress >= 0.98 && ' · finished'}
              </p>
              {doc.reading_progress > 0 && (
                <ProgressBar value={doc.reading_progress} label={`Progress in ${doc.title}`} />
              )}
            </Link>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav className="pagination" aria-label="Pagination">
          <button
            type="button"
            className="button"
            disabled={page <= 1}
            onClick={() => update('page', String(page - 1))}
          >
            Previous
          </button>
          <span className="muted">
            Page {page} of {pages}
          </span>
          <button
            type="button"
            className="button"
            disabled={page >= pages}
            onClick={() => update('page', String(page + 1))}
          >
            Next
          </button>
        </nav>
      )}
    </>
  );
}
