import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { useShortcuts } from '../lib/shortcuts';
import ErrorBoundary from './ErrorBoundary';
import ShortcutsHelp from './ShortcutsHelp';

const NAV = [
  { to: '/', label: 'Library', end: true },
  { to: '/highlights', label: 'Highlights' },
  { to: '/collections', label: 'Collections' },
  { to: '/tags', label: 'Tags' },
  { to: '/dashboard', label: 'Dashboard' },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const [showShortcuts, setShowShortcuts] = useState(false);

  useShortcuts(
    {
      '/': () => searchRef.current?.focus(),
      '?': () => setShowShortcuts(true),
    },
    !showShortcuts,
  );

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="annotate home">
          <span className="brand-mark" aria-hidden="true" />
          annotate
        </NavLink>
        <nav className="topnav" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <form className="topsearch" role="search" onSubmit={onSearch}>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search notes and documents"
            aria-keyshortcuts="/"
            aria-label="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <div className="topbar-user">
          <NavLink to="/settings" className="user-link" title={user?.email}>
            {user?.display_name || user?.email}
          </NavLink>
          <button type="button" className="button-link" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <main className="content" id="main" tabIndex={-1}>
        {/* Keyed by path so moving to another page clears a crash. */}
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      {showShortcuts && <ShortcutsHelp onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
