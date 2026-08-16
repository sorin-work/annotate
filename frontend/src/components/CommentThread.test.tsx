import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '../api/client';
import type { Comment } from '../api/types';
import { mockApi, renderApp, user } from '../test/utils';
import CommentThread from './CommentThread';

const comment: Comment = {
  id: 3,
  highlight_id: 11,
  body: 'Still true on the second read.',
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-01T10:00:00Z',
};

beforeEach(() => tokenStore.set('token'));
afterEach(() => vi.unstubAllGlobals());

describe('CommentThread', () => {
  it('lists comments and adds a new one', async () => {
    let comments = [comment];
    const { calls } = mockApi({
      'GET /auth/me': user,
      'GET /highlights/11/comments': () => comments,
      'POST /highlights/11/comments': () => {
        const added = { ...comment, id: 4, body: 'And the third.' };
        comments = [...comments, added];
        return added;
      },
    });
    renderApp(<CommentThread highlightId={11} />);

    expect(await screen.findByText('Still true on the second read.')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Comment' });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Add a comment'), '  And the third.  ');
    await userEvent.click(submit);

    expect(await screen.findByText('And the third.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ body: 'And the third.' });
    await waitFor(() => expect(screen.getByLabelText('Add a comment')).toHaveValue(''));
  });

  it('deletes a comment', async () => {
    let comments = [comment];
    mockApi({
      'GET /auth/me': user,
      'GET /highlights/11/comments': () => comments,
      'DELETE /comments/3': () => {
        comments = [];
        return undefined;
      },
    });
    renderApp(<CommentThread highlightId={11} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(screen.queryByText('Still true on the second read.')).not.toBeInTheDocument(),
    );
  });
});
