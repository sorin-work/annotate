import { Link, useLocation } from 'react-router';
import EmptyState from '../components/EmptyState';
import { useDocumentTitle } from '../lib/useDocumentTitle';

export default function NotFoundPage() {
  const { pathname } = useLocation();
  useDocumentTitle('Not found');
  return (
    <EmptyState title="This page doesn't exist">
      Nothing lives at <code>{pathname}</code>. Try the <Link to="/">library</Link> or{' '}
      <Link to="/search">search</Link>.
    </EmptyState>
  );
}
