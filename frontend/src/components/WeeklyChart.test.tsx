import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WeeklyChart from './WeeklyChart';

const weeks = [
  { week_start: '2026-05-04', highlights: 0 },
  { week_start: '2026-05-11', highlights: 2 },
  { week_start: '2026-05-18', highlights: 8 },
];

describe('WeeklyChart', () => {
  it('scales bars to the busiest week and explains each bar', () => {
    const { container } = render(<WeeklyChart weeks={weeks} />);
    const bars = [...container.querySelectorAll<HTMLElement>('.weekly-bar span')];
    expect(bars.map((bar) => bar.style.height)).toEqual(['0%', '25%', '100%']);
    expect(container.querySelectorAll('.weekly-bar')[2]).toHaveAttribute(
      'title',
      expect.stringMatching(/: 8 highlights$/),
    );
    expect(screen.getByText('10 highlights in the last 3 weeks')).toBeInTheDocument();
  });

  it('has a table for screen readers', () => {
    render(<WeeklyChart weeks={weeks} />);
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows.slice(1).map((row) => row.lastElementChild?.textContent)).toEqual(['0', '2', '8']);
  });
});
