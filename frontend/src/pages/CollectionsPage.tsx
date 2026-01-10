import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { collectionsApi } from '../api/collections';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import PageHeader from '../components/PageHeader';
import { plural } from '../lib/format';

export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const {
    data: collections,
    isPending,
    error,
  } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.list,
  });

  const create = useMutation({
    mutationFn: () => collectionsApi.create(name.trim(), description.trim() || null),
    onSuccess: () => {
      setName('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim()) create.mutate();
  }

  return (
    <>
      <PageHeader title="Collections" subtitle="Group related documents, like shelves." />
      <form className="panel form inline-form" onSubmit={onSubmit}>
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
        </label>
        <label className="field grow">
          <span>Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <button
          type="submit"
          className="button primary"
          disabled={!name.trim() || create.isPending}
        >
          New collection
        </button>
      </form>
      <ErrorMessage error={create.error ?? error} />

      {isPending && <p className="muted">Loading…</p>}
      {collections?.length === 0 && (
        <EmptyState title="No collections yet">
          Create one above, then add documents to it from the document page.
        </EmptyState>
      )}
      <ul className="collection-grid">
        {collections?.map((c) => (
          <li key={c.id}>
            <Link to={`/collections/${c.id}`} className="collection-card">
              <h2>{c.name}</h2>
              {c.description && <p className="muted">{c.description}</p>}
              <p className="small muted">{plural(c.document_count, 'document')}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
