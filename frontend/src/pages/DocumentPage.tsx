import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { documentsApi } from '../api/documents';
import { highlightsApi } from '../api/highlights';
import ErrorMessage from '../components/ErrorMessage';
import Reader from '../components/Reader';
import { formatDate, readingTime } from '../lib/format';

export default function DocumentPage() {
  const id = Number(useParams().id);

  const documentQuery = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentsApi.get(id),
  });
  const highlightsQuery = useQuery({
    queryKey: ['highlights', id],
    queryFn: () => highlightsApi.forDocument(id),
  });

  const doc = documentQuery.data;

  if (documentQuery.error) {
    return (
      <div className="panel">
        <ErrorMessage error={documentQuery.error} />
        <Link to="/">Back to the library</Link>
      </div>
    );
  }
  if (!doc) return <p className="muted">Loading…</p>;

  return (
    <div className="document-page">
      <article className="document-main">
        <header className="document-header">
          <Link to="/" className="muted small">
            ← Library
          </Link>
          <h1>{doc.title}</h1>
          <p className="muted">
            {doc.author && <span className="author">{doc.author} · </span>}
            {readingTime(doc.word_count)} · added {formatDate(doc.created_at)}
            {doc.source_url && (
              <>
                {' · '}
                <a href={doc.source_url} target="_blank" rel="noreferrer">
                  source
                </a>
              </>
            )}
          </p>
        </header>

        <Reader
          content={doc.content}
          sourceType={doc.source_type}
          highlights={highlightsQuery.data ?? []}
          onSelect={() => {}}
          onHighlightClick={() => {}}
        />
      </article>
    </div>
  );
}
