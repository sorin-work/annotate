import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { activityApi } from '../api/activity';
import type { ActivityItem } from '../api/types';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import PageHeader from '../components/PageHeader';
import { formatDate, timeAgo } from '../lib/format';

function describe(item: ActivityItem) {
  const doc = <Link to={`/documents/${item.document.id}`}>{item.document.title}</Link>;
  if (item.type === 'document_added') return <>Added {doc}</>;
  const h = item.highlight!;
  const quote = (
    <Link
      to={`/documents/${item.document.id}?highlight=${h.id}`}
      className={`activity-quote border-${h.color}`}
    >
      {h.quote}
    </Link>
  );
  if (item.type === 'comment_added') {
    return (
      <>
        Commented in {doc}
        {quote}
        <span className="activity-note">{item.comment?.body}</span>
      </>
    );
  }
  return (
    <>
      Highlighted in {doc}
      <Link
        to={`/documents/${item.document.id}?highlight=${h.id}`}
        className={`activity-quote border-${h.color}`}
      >
        {h.quote}
      </Link>
      {h.note && <span className="activity-note">{h.note}</span>}
    </>
  );
}

/** Groups items under a heading per calendar day. */
function byDay(items: ActivityItem[]): [string, ActivityItem[]][] {
  const days = new Map<string, ActivityItem[]>();
  for (const item of items) {
    const day = formatDate(item.at);
    days.set(day, [...(days.get(day) ?? []), item]);
  }
  return [...days];
}

export default function ActivityPage() {
  const query = useInfiniteQuery({
    queryKey: ['activity'],
    queryFn: ({ pageParam }) => activityApi.list(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_before,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader title="Recent activity" />
      <ErrorMessage error={query.error} />
      {query.isPending && <p className="muted">Loading…</p>}
      {query.data && items.length === 0 && (
        <EmptyState title="Nothing here yet">
          <Link to="/documents/new">Add a document</Link> and start highlighting.
        </EmptyState>
      )}
      {byDay(items).map(([day, dayItems]) => (
        <section key={day} className="activity-day" aria-label={day}>
          <h2>{day}</h2>
          <ul className="activity-list">
            {dayItems.map((item) => (
              <li
                key={`${item.type}-${item.comment?.id ?? item.highlight?.id ?? item.document.id}`}
              >
                <span className="activity-text">{describe(item)}</span>
                <time className="muted small" dateTime={item.at}>
                  {timeAgo(item.at)}
                </time>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {query.hasNextPage && (
        <div className="load-more">
          <button
            type="button"
            className="button"
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Older'}
          </button>
        </div>
      )}
    </>
  );
}
