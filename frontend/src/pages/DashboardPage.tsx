import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { statsApi } from '../api/stats';
import { COLORS } from '../api/types';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import PageHeader from '../components/PageHeader';
import WeeklyChart from '../components/WeeklyChart';
import { plural } from '../lib/format';

const numberFormat = new Intl.NumberFormat();

export default function DashboardPage() {
  const {
    data: stats,
    error,
    isPending,
  } = useQuery({
    queryKey: ['stats'],
    queryFn: statsApi.get,
  });

  if (error) return <ErrorMessage error={error} />;
  if (isPending || !stats) return <p className="muted">Loading…</p>;

  const tiles: [string, number][] = [
    ['Documents', stats.documents],
    ['Highlights', stats.highlights],
    ['Notes', stats.notes],
    ['Tags', stats.tags],
    ['Words in your library', stats.words],
  ];
  const maxColor = Math.max(1, ...Object.values(stats.colors));

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your reading at a glance" />
      <dl className="stat-tiles">
        {tiles.map(([label, value]) => (
          <div key={label} className="stat-tile">
            <dt>{label}</dt>
            <dd>{numberFormat.format(value)}</dd>
          </div>
        ))}
      </dl>

      {stats.highlights === 0 ? (
        <EmptyState title="Nothing to chart yet">
          Highlight a few passages and this page fills up.
        </EmptyState>
      ) : (
        <div className="dashboard-grid">
          <section className="panel wide" aria-labelledby="weekly-heading">
            <h2 id="weekly-heading">Highlights per week</h2>
            <WeeklyChart weeks={stats.weekly} />
          </section>

          <section className="panel" aria-labelledby="colors-heading">
            <h2 id="colors-heading">Highlights by colour</h2>
            <ul className="color-bars">
              {COLORS.map((color) => (
                <li key={color}>
                  <Link to={`/highlights?color=${color}`} className="color-bar-label">
                    {color}
                  </Link>
                  <span className="color-bar-track">
                    <span
                      className={`color-bar-fill swatch-${color}`}
                      style={{ width: `${(stats.colors[color] / maxColor) * 100}%` }}
                    />
                  </span>
                  <span className="color-bar-value">{stats.colors[color]}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel" aria-labelledby="tags-heading">
            <h2 id="tags-heading">Most used tags</h2>
            {stats.top_tags.length === 0 ? (
              <p className="muted small">No tags yet.</p>
            ) : (
              <ol className="ranked-list">
                {stats.top_tags.map((tag) => (
                  <li key={tag.name}>
                    <Link to={`/highlights?tag=${encodeURIComponent(tag.name)}`}>#{tag.name}</Link>
                    <span className="muted small">{plural(tag.count, 'highlight')}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel" aria-labelledby="documents-heading">
            <h2 id="documents-heading">Most highlighted</h2>
            <ol className="ranked-list">
              {stats.most_highlighted.map((doc) => (
                <li key={doc.id}>
                  <Link to={`/documents/${doc.id}`}>{doc.title}</Link>
                  <span className="muted small">{plural(doc.highlight_count, 'highlight')}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </>
  );
}
