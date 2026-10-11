import { Link } from 'react-router';
import type { Highlight, HighlightWithDocument } from '../api/types';
import { timeAgo } from '../lib/format';
import { quoteAsMarkdown } from '../lib/quote';
import CopyButton from './CopyButton';
import Matched from './Matched';

interface Props {
  highlight: Highlight | HighlightWithDocument;
  showDocument?: boolean;
  /** When given, the card gets a checkbox for bulk actions. */
  selected?: boolean;
  onToggleSelected?: () => void;
  /** A search query to mark in the quote and note. */
  query?: string;
}

export default function HighlightCard({
  highlight,
  showDocument = true,
  selected,
  onToggleSelected,
  query,
}: Props) {
  const documentTitle = 'document_title' in highlight ? highlight.document_title : null;
  return (
    <article className={`highlight-card border-${highlight.color}${selected ? ' selected' : ''}`}>
      {onToggleSelected && (
        <input
          type="checkbox"
          className="highlight-select"
          aria-label={`Select “${highlight.quote.slice(0, 40)}”`}
          checked={Boolean(selected)}
          onChange={onToggleSelected}
        />
      )}
      <blockquote>
        <Matched text={highlight.quote} query={query} />
      </blockquote>
      {highlight.note && (
        <p className="note">
          <Matched text={highlight.note} query={query} />
        </p>
      )}
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
          {' · '}
          <CopyButton
            text={quoteAsMarkdown(highlight.quote, { title: documentTitle, note: highlight.note })}
          />
        </span>
      </footer>
    </article>
  );
}
