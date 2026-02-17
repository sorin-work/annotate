import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CopyButton from './CopyButton';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('CopyButton', () => {
  it('says when copying failed and resets after a moment', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', {
      clipboard: { writeText: () => Promise.reject(new Error('denied')) },
    });
    render(<CopyButton text="quote" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });
    expect(screen.getByRole('button', { name: 'Copy failed' })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });
});
