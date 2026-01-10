import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { collectionsApi } from '../api/collections';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { plural } from '../lib/format';

export default function CollectionPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data: collection, error } = useQuery({
    queryKey: ['collection', id],
    queryFn: () => collectionsApi.get(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['collection', id] });
    queryClient.invalidateQueries({ queryKey: ['collections'] });
    queryClient.invalidateQueries({ queryKey: ['document'] });
  };

  const save = useMutation({
    mutationFn: () =>
      collectionsApi.update(id, { name: name.trim(), description: description.trim() || null }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
    },
  });
  const removeDocument = useMutation({
    mutationFn: (documentId: number) => collectionsApi.removeDocument(id, documentId),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: () => collectionsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      navigate('/collections', { replace: true });
    },
  });

  if (error) return <ErrorMessage error={error} />;
  if (!collection) return <p className="muted">Loading…</p>;

  function startEditing() {
    setName(collection!.name);
    setDescription(collection!.description ?? '');
    setEditing(true);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <>
      <Link to="/collections" className="muted small">
        ← Collections
      </Link>
      <PageHeader
        title={collection.name}
        subtitle={collection.description ?? plural(collection.document_count, 'document')}
        actions={
          <>
            <button type="button" className="button" onClick={startEditing}>
              Edit
            </button>
            <button
              type="button"
              className="button danger"
              onClick={() =>
                window.confirm(`Delete the collection "${collection.name}"? Documents are kept.`) &&
                remove.mutate()
              }
            >
              Delete
            </button>
          </>
        }
      />
      <ErrorMessage error={removeDocument.error ?? remove.error} />

      {collection.documents.length === 0 ? (
        <EmptyState title="This collection is empty">
          Open a document and use <em>Collections</em> to add it here.
        </EmptyState>
      ) : (
        <ul className="document-list compact">
          {collection.documents.map((doc) => (
            <li key={doc.id} className="document-row">
              <Link to={`/documents/${doc.id}`}>
                <strong>{doc.title}</strong>
                {doc.author && <span className="muted"> · {doc.author}</span>}
              </Link>
              <span className="muted small">{plural(doc.highlight_count, 'highlight')}</span>
              <button
                type="button"
                className="button-link"
                onClick={() => removeDocument.mutate(doc.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <p>
        <Link to={`/highlights?collection=${id}`}>See all highlights in this collection →</Link>
      </p>

      {editing && (
        <Modal title="Edit collection" onClose={() => setEditing(false)}>
          <form className="form" onSubmit={onSubmit}>
            <label className="field">
              <span>Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </label>
            <ErrorMessage error={save.error} />
            <div className="form-actions">
              <button type="button" className="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={save.isPending || !name.trim()}
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
