import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import Modal from './Modal';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open && (
        <Modal title="Details" onClose={() => setOpen(false)}>
          <input aria-label="Title" />
          <button type="button">Save</button>
        </Modal>
      )}
    </>
  );
}

describe('Modal', () => {
  it('focuses the first field and keeps tab inside the dialog', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByLabelText('Title')).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
  });

  it('closes on escape and gives focus back', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('closes when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal title="Details" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    );
    await userEvent.pointer({
      keys: '[MouseLeft]',
      target: screen.getByRole('dialog').parentElement!,
    });
    expect(onClose).toHaveBeenCalled();
  });
});
