import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './Toast';

function Trigger({ onUndo }: { onUndo: () => void }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => toast('Highlight deleted', { label: 'Undo', onClick: onUndo })}
    >
      Delete
    </button>
  );
}

afterEach(() => vi.useRealTimers());

describe('toasts', () => {
  it('shows a message with an action', async () => {
    const onUndo = vi.fn();
    render(
      <ToastProvider>
        <Trigger onUndo={onUndo} />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('status')).toHaveTextContent('Highlight deleted');

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('goes away on its own', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger onUndo={() => {}} />
      </ToastProvider>,
    );
    act(() => screen.getByRole('button', { name: 'Delete' }).click());
    expect(screen.getByRole('status')).toHaveTextContent('Highlight deleted');
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('stays while the pointer is over it', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger onUndo={() => {}} />
      </ToastProvider>,
    );
    act(() => screen.getByRole('button', { name: 'Delete' }).click());
    const toast = screen.getByText('Highlight deleted').parentElement!;

    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByRole('status')).toHaveTextContent('Highlight deleted');

    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
