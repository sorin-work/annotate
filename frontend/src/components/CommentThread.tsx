import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { commentsApi } from '../api/comments';
import { timeAgo } from '../lib/format';
import ErrorMessage from './ErrorMessage';

/** Later thoughts on a highlight, oldest first, with a box to add another. */
export default function CommentThread({ highlightId }: { highlightId: number }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const key = ['comments', highlightId];
  const { data: comments = [] } = useQuery({
    queryKey: key,
    queryFn: () => commentsApi.list(highlightId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: key });
    // Comment counts live on the highlights; activity lists comments too.
    for (const other of ['highlights', 'highlights-all', 'activity']) {
      queryClient.invalidateQueries({ queryKey: [other] });
    }
  };
  const add = useMutation({
    mutationFn: () => commentsApi.add(highlightId, body.trim()),
    onSuccess: () => {
      setBody('');
      refresh();
    },
  });
  const remove = useMutation({ mutationFn: commentsApi.remove, onSuccess: refresh });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const edit = useMutation({
    mutationFn: () => commentsApi.update(editingId!, draft.trim()),
    onSuccess: () => {
      setEditingId(null);
      refresh();
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (body.trim()) add.mutate();
  }

  return (
    <section className="comments" aria-label="Comments">
      {comments.length > 0 && (
        <ol className="comment-list">
          {comments.map((comment) => (
            <li key={comment.id}>
              {editingId === comment.id ? (
                <form
                  className="comment-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (draft.trim()) edit.mutate();
                  }}
                >
                  <textarea
                    aria-label="Edit comment"
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <span>
                    <button
                      type="button"
                      className="button-link small"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>{' '}
                    <button
                      type="submit"
                      className="button small"
                      disabled={!draft.trim() || edit.isPending}
                    >
                      Save
                    </button>
                  </span>
                </form>
              ) : (
                <p>{comment.body}</p>
              )}
              <span className="muted small">
                {timeAgo(comment.created_at)}
                {comment.updated_at !== comment.created_at && ' · edited'}
                {' · '}
                <button
                  type="button"
                  className="button-link small"
                  onClick={() => {
                    setEditingId(comment.id);
                    setDraft(comment.body);
                  }}
                >
                  Edit
                </button>
                {' · '}
                <button
                  type="button"
                  className="button-link small"
                  onClick={() => remove.mutate(comment.id)}
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <form className="comment-form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor={`comment-${highlightId}`}>
          Add a comment
        </label>
        <textarea
          id={`comment-${highlightId}`}
          rows={2}
          value={body}
          placeholder="A later thought…"
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" className="button small" disabled={!body.trim() || add.isPending}>
          Comment
        </button>
      </form>
      <ErrorMessage error={add.error ?? remove.error ?? edit.error} />
    </section>
  );
}
