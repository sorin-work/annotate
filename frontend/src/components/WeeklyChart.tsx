import { plural } from '../lib/format';

interface Week {
  week_start: string;
  highlights: number;
}

const dayFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

function label(weekStart: string): string {
  // week_start is a plain date; read it as UTC so it never shifts a day.
  return dayFormat.format(new Date(`${weekStart}T00:00:00Z`));
}

/** Highlights per week as small bars, with a table for screen readers. */
export default function WeeklyChart({ weeks }: { weeks: Week[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.highlights));
  const total = weeks.reduce((sum, w) => sum + w.highlights, 0);

  return (
    <figure className="weekly-chart">
      <div className="weekly-bars" aria-hidden="true">
        {weeks.map((week) => (
          <div
            key={week.week_start}
            className="weekly-bar"
            title={`Week of ${label(week.week_start)}: ${plural(week.highlights, 'highlight')}`}
          >
            <span style={{ height: `${(week.highlights / max) * 100}%` }} />
          </div>
        ))}
      </div>
      {weeks.length > 0 && (
        <div className="weekly-axis muted small" aria-hidden="true">
          <span>{label(weeks[0]!.week_start)}</span>
          <span>This week</span>
        </div>
      )}
      <figcaption className="muted small">
        {plural(total, 'highlight')} in the last {weeks.length} weeks
      </figcaption>
      <table className="sr-only">
        <caption>Highlights per week</caption>
        <thead>
          <tr>
            <th scope="col">Week of</th>
            <th scope="col">Highlights</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.week_start}>
              <td>{label(week.week_start)}</td>
              <td>{week.highlights}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
