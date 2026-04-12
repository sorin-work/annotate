import { render, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { isTypingTarget, useShortcuts } from './shortcuts';

describe('useShortcuts', () => {
  it('calls the handler for its key', async () => {
    const onJ = vi.fn();
    renderHook(() => useShortcuts({ j: onJ }));
    await userEvent.keyboard('j');
    await userEvent.keyboard('k');
    expect(onJ).toHaveBeenCalledTimes(1);
  });

  it('ignores keys with modifiers and while disabled', async () => {
    const onJ = vi.fn();
    const { rerender } = renderHook(({ enabled }) => useShortcuts({ j: onJ }, enabled), {
      initialProps: { enabled: true },
    });
    await userEvent.keyboard('{Control>}j{/Control}');
    rerender({ enabled: false });
    await userEvent.keyboard('j');
    expect(onJ).not.toHaveBeenCalled();
  });

  it('ignores keys typed into fields', async () => {
    const onJ = vi.fn();
    function Field() {
      useShortcuts({ j: onJ });
      return <input aria-label="Note" />;
    }
    const { getByLabelText } = render(<Field />);
    await userEvent.type(getByLabelText('Note'), 'jj');
    expect(onJ).not.toHaveBeenCalled();
    expect(getByLabelText('Note')).toHaveValue('jj');
  });
});

describe('isTypingTarget', () => {
  it('recognises form fields', () => {
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true);
    expect(isTypingTarget(document.createElement('button'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
