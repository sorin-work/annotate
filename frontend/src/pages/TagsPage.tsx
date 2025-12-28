import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { tagsApi } from '../api/tags';
import type { Tag } from '../api/types';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import PageHeader from '../components/PageHeader';
import { plural } from '../lib/format';

function TagRow({
  tag,
  onRename,
  onDelete,
}: {
  tag: Tag;
  onRename: (name: string) => Promise<unknown>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim() && name.trim() !== tag.name) await onRename(name.trim());
    setEditing(false);
  }

  return (
    <li className="tag-row">
      {editing ? (
        <form onSubmit={submit} className="inline-edit">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label={`New name for ${tag.name}`}
            autoFocus
            maxLength={50}
          />
          <button type="submit" className="button small primary">
            Save
          </button>
          <button type="button" className="button small" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <>
          <Link to={`/highlights?tag=${encodeURIComponent(tag.name)}`} className="tag">
            #{tag.name}
          </Link>
          <span className="muted small">{plural(tag.highlight_count, 'highlight')}</span>
          <span className="spacer" />
          <button type="button" className="button-link" onClick={() => setEditing(true)}>
            Rename
          </button>
          <button type="button" className="button-link danger" onClick={onDelete}>
            Delete
          </button>
        </>
      )}
    </li>
  );
}

export default function TagsPage() {
  const queryClient = useQueryClient();
  const { data: tags, isPending, error } = useQuery({ queryKey: ['tags'], queryFn: tagsApi.list });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tags'] });
    queryClient.invalidateQueries({ queryKey: ['highlights'] });
    queryClient.invalidateQueries({ queryKey: ['highlights-all'] });
  };
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => tagsApi.rename(id, name),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: tagsApi.remove, onSuccess: invalidate });

  return (
    <>
      <PageHeader
        title="Tags"
        subtitle="Renaming a tag to one that already exists merges the two."
      />
      <ErrorMessage error={error ?? rename.error ?? remove.error} />
      {isPending && <p className="muted">Loading…</p>}
      {tags?.length === 0 && (
        <EmptyState title="No tags yet">Add tags to a highlight from the document page.</EmptyState>
      )}
      <ul className="tag-list panel">
        {tags?.map((tag) => (
          <TagRow
            key={tag.id}
            tag={tag}
            onRename={(name) => rename.mutateAsync({ id: tag.id, name })}
            onDelete={() =>
              window.confirm(`Remove #${tag.name} from all highlights?`) && remove.mutate(tag.id)
            }
          />
        ))}
      </ul>
    </>
  );
}
