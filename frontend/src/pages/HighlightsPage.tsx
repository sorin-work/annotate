import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { highlightsApi } from '../api/highlights';
import { tagsApi } from '../api/tags';
import { COLORS } from '../api/types';
import type { Color } from '../api/types';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import HighlightCard from '../components/HighlightCard';
import PageHeader from '../components/PageHeader';
import { plural } from '../lib/format';

const PAGE_SIZE = 30;

export default function HighlightsPage() {
  const [params, setParams] = useSearchParams();
  const tag = params.get('tag');
  const color = params.get('color') as Color | null;

  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const query = useInfiniteQuery({
    queryKey: ['highlights-all', { tag, color }],
    queryFn: ({ pageParam }) =>
      highlightsApi.list({ tag, color, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, p) => sum + p.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
  });

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const filtered = Boolean(tag || color);

  return (
    <>
      <PageHeader
        title="Highlights"
        subtitle={query.data ? plural(total, 'highlight') : undefined}
      />
      <div className="toolbar">
        <select
          aria-label="Tag"
          value={tag ?? ''}
          onChange={(e) => update('tag', e.target.value || null)}
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.name}>
              #{t.name} ({t.highlight_count})
            </option>
          ))}
        </select>
        <select
          aria-label="Color"
          value={color ?? ''}
          onChange={(e) => update('color', e.target.value || null)}
        >
          <option value="">All colours</option>
          {COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {filtered && (
          <button type="button" className="button-link" onClick={() => setParams({})}>
            Clear filters
          </button>
        )}
      </div>

      <ErrorMessage error={query.error} />
      {query.isPending && <p className="muted">Loading…</p>}
      {query.data && items.length === 0 && (
        <EmptyState title={filtered ? 'No highlights match these filters' : 'No highlights yet'}>
          {!filtered && 'Open a document and select some text to create your first highlight.'}
        </EmptyState>
      )}

      <div className="highlight-list">
        {items.map((h) => (
          <HighlightCard key={h.id} highlight={h} />
        ))}
      </div>

      {query.hasNextPage && (
        <div className="load-more">
          <button
            type="button"
            className="button"
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  );
}
