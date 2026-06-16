import { Link, useLocation } from 'react-router';
import EmptyState from '../components/EmptyState';

export default function NotFoundPage() {
  const { pathname } = useLocation();
  return (
    <EmptyState title="This page doesn't exist">
      Nothing lives at <code>{pathname}</code>. Try the <Link to="/">library</Link> or{' '}
      <Link to="/search">search</Link>.
    </EmptyState>
  );
}
