import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { documentsApi } from '../api/documents';
import { exportsApi } from '../api/exports';
import { highlightsApi } from '../api/highlights';
import type { HighlightChanges } from '../api/highlights';
import { tagsApi } from '../api/tags';
import type { Color, Highlight } from '../api/types';
import AddToCollection from '../components/AddToCollection';
import DocumentDetailsForm from '../components/DocumentDetailsForm';
import type { DocumentDetails } from '../components/DocumentDetailsForm';
import ErrorMessage from '../components/ErrorMessage';
import ExportButtons from '../components/ExportButtons';
import HighlightEditor from '../components/HighlightEditor';
import Modal from '../components/Modal';
import Reader from '../components/Reader';
import type { SelectionInfo } from '../components/Reader';
import SelectionToolbar from '../components/SelectionToolbar';
import { formatDate, plural, readingTime } from '../lib/format';

export default function DocumentPage() {
  const id = Number(useParams().id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [activeId, setActiveId] = useState<number | null>(() =>
    params.get('highlight') ? Number(params.get('highlight')) : null,
  );
  const [editing, setEditing] = useState(false);
  const [organising, setOrganising] = useState(false);

  const documentQuery = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentsApi.get(id),
  });
  const highlightsQuery = useQuery({
    queryKey: ['highlights', id],
    queryFn: () => highlightsApi.forDocument(id),
  });
  const { data: tags = [] } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const doc = documentQuery.data;
  const highlights = highlightsQuery.data ?? [];
  const highlightsKey = ['highlights', id];

  const refreshRelated = () => {
    queryClient.invalidateQueries({ queryKey: ['tags'] });
    queryClient.invalidateQueries({ queryKey: ['highlights-all'] });
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['search'] });
  };

  const create = useMutation({
    mutationFn: ({ start, end, color }: { start: number; end: number; color: Color }) =>
      highlightsApi.create(id, { start_offset: start, end_offset: end, color }),
    onSuccess: (created) => {
      queryClient.setQueryData<Highlight[]>(highlightsKey, (old = []) =>
        [...old, created].sort((a, b) => a.start_offset - b.start_offset || a.id - b.id),
      );
      setActiveId(created.id);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
      refreshRelated();
    },
  });

  const update = useMutation({
    mutationFn: ({ highlightId, changes }: { highlightId: number; changes: HighlightChanges }) =>
      highlightsApi.update(highlightId, changes),
    onSuccess: (updated) => {
      queryClient.setQueryData<Highlight[]>(highlightsKey, (old = []) =>
        old.map((h) => (h.id === updated.id ? updated : h)),
      );
      refreshRelated();
    },
  });

  const remove = useMutation({
    mutationFn: (highlightId: number) => highlightsApi.remove(highlightId),
    onSuccess: (_, highlightId) => {
      queryClient.setQueryData<Highlight[]>(highlightsKey, (old = []) =>
        old.filter((h) => h.id !== highlightId),
      );
      setActiveId(null);
      refreshRelated();
    },
  });

  const saveDetails = useMutation({
    mutationFn: (details: DocumentDetails) => documentsApi.update(id, details),
    onSuccess: (updated) => {
      queryClient.setQueryData(['document', id], updated);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setEditing(false);
    },
  });

  const removeDocument = useMutation({
    mutationFn: () => documentsApi.remove(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['document', id] });
      refreshRelated();
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      navigate('/', { replace: true });
    },
  });

  // Scroll a highlight into view when it is picked from the sidebar or a link.
  useEffect(() => {
    if (activeId === null || !highlights.length) return;
    const mark = document.querySelector(`mark[data-highlight-id="${activeId}"]`);
    mark?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [activeId, highlights.length]);

  const onSelect = useCallback((info: SelectionInfo | null) => setSelection(info), []);
  const onHighlightClick = useCallback((highlightId: number) => {
    setSelection(null);
    setActiveId(highlightId);
    document.getElementById(`highlight-${highlightId}`)?.scrollIntoView?.({ block: 'nearest' });
  }, []);

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
          {doc.collections.length > 0 && (
            <p className="collections-line">
              {doc.collections.map((c) => (
                <Link key={c.id} to={`/collections/${c.id}`} className="chip">
                  {c.name}
                </Link>
              ))}
            </p>
          )}
          <div className="document-actions">
            <button type="button" className="button small" onClick={() => setEditing(true)}>
              Edit details
            </button>
            <button type="button" className="button small" onClick={() => setOrganising(true)}>
              Collections
            </button>
            <button
              type="button"
              className="button small danger"
              onClick={() => {
                if (window.confirm(`Delete "${doc.title}" and all of its highlights?`)) {
                  removeDocument.mutate();
                }
              }}
            >
              Delete
            </button>
          </div>
        </header>

        <p className="hint muted small">Select any passage to highlight it.</p>
        <Reader
          content={doc.content}
          sourceType={doc.source_type}
          highlights={highlights}
          activeId={activeId}
          onSelect={onSelect}
          onHighlightClick={onHighlightClick}
        />
        {selection && (
          <SelectionToolbar
            selection={selection}
            busy={create.isPending}
            onHighlight={(color) =>
              create.mutate({ start: selection.start, end: selection.end, color })
            }
            onCancel={() => setSelection(null)}
          />
        )}
        <ErrorMessage error={create.error} />
      </article>

      <aside className="document-sidebar" aria-label="Highlights">
        <div className="sidebar-header">
          <h2>{plural(highlights.length, 'highlight')}</h2>
          <ExportButtons label="Export" onExport={(format) => exportsApi.document(id, format)} />
        </div>
        {highlights.length === 0 && (
          <p className="muted small">
            Nothing highlighted yet. Select text in the document and pick a colour.
          </p>
        )}
        <ErrorMessage error={update.error ?? remove.error} />
        <ul className="sidebar-list">
          {highlights.map((h) => (
            <li key={h.id}>
              <HighlightEditor
                key={`${h.id}-${activeId === h.id}`}
                highlight={h}
                active={activeId === h.id}
                tagSuggestions={tags.map((t) => t.name)}
                onActivate={() => setActiveId(h.id)}
                onSave={(changes) => update.mutateAsync({ highlightId: h.id, changes })}
                onDelete={() => remove.mutate(h.id)}
              />
            </li>
          ))}
        </ul>
      </aside>

      {editing && (
        <Modal title="Document details" onClose={() => setEditing(false)}>
          <DocumentDetailsForm
            document={doc}
            onSubmit={(details) => saveDetails.mutateAsync(details)}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      )}
      {organising && (
        <Modal title="Collections" onClose={() => setOrganising(false)}>
          <AddToCollection document={doc} />
        </Modal>
      )}
    </div>
  );
}
