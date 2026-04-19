import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ColorPicker from './ColorPicker';

describe('ColorPicker', () => {
  it('marks the current colour and reports clicks', async () => {
    const onChange = vi.fn();
    render(<ColorPicker value="blue" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'blue' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'pink' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'green' }));
    expect(onChange).toHaveBeenCalledWith('green');
  });

  it('mentions the number keys when asked to', () => {
    render(<ColorPicker numbered onChange={() => {}} />);
    const yellow = screen.getByRole('button', { name: 'yellow' });
    expect(yellow).toHaveAttribute('title', 'yellow (1)');
    expect(yellow).toHaveAttribute('aria-keyshortcuts', '1');
    expect(screen.getByRole('button', { name: 'purple' })).toHaveAttribute('title', 'purple (5)');
  });
});
