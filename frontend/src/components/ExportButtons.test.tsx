import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ExportButtons from './ExportButtons';

describe('ExportButtons', () => {
  it('exports in the chosen format', async () => {
    const onExport = vi.fn(async () => {});
    render(<ExportButtons onExport={onExport} />);
    await userEvent.click(screen.getByRole('button', { name: 'JSON' }));
    expect(onExport).toHaveBeenCalledWith('json');
  });

  it('shows what went wrong', async () => {
    render(<ExportButtons onExport={() => Promise.reject(new Error('Export failed: 500'))} />);
    await userEvent.click(screen.getByRole('button', { name: 'CSV' }));
    await waitFor(() => expect(screen.getByText('Export failed: 500')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'CSV' })).toBeEnabled();
  });
});
