import { Link } from 'react-router';
import type { Highlight, HighlightWithDocument } from '../api/types';
import { timeAgo } from '../lib/format';

interface Props {
  highlight: Highlight | HighlightWithDocument;
  showDocument?: boolean;
}

export default function HighlightCard({ highlight, showDocument = true }: Props) {
  const documentTitle = 'document_title' in highlight ? highlight.document_title : null;
  return (
    <article className={`highlight-card border-${highlight.color}`}>
      <blockquote>{highlight.quote}</blockquote>
      {highlight.note && <p className="note">{highlight.note}</p>}
      <footer>
        {highlight.tags.length > 0 && (
          <span className="tags">
            {highlight.tags.map((tag) => (
              <Link key={tag} className="tag" to={`/highlights?tag=${encodeURIComponent(tag)}`}>
                #{tag}
              </Link>
            ))}
          </span>
        )}
        <span className="muted small">
          {showDocument && documentTitle && (
            <>
              <Link to={`/documents/${highlight.document_id}?highlight=${highlight.id}`}>
                {documentTitle}
              </Link>
              {' · '}
            </>
          )}
          {timeAgo(highlight.created_at)}
        </span>
      </footer>
    </article>
  );
}
