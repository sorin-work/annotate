import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProgressBar from './ProgressBar';

describe('ProgressBar', () => {
  it('shows whole percentages and keeps them between 0 and 100', () => {
    const { rerender } = render(<ProgressBar value={0.426} label="Progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '43');
    expect(bar).toHaveAttribute('title', '43% read');

    rerender(<ProgressBar value={1.2} label="Progress" />);
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    rerender(<ProgressBar value={-0.1} label="Progress" />);
    expect(bar).toHaveAttribute('aria-valuenow', '0');
  });
});
