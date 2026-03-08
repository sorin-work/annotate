import { useState } from 'react';
import type { FormEvent } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';

const NAV = [
  { to: '/', label: 'Library', end: true },
  { to: '/highlights', label: 'Highlights' },
  { to: '/collections', label: 'Collections' },
  { to: '/tags', label: 'Tags' },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="app">
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
            type="search"
            placeholder="Search notes and documents"
            aria-label="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <div className="topbar-user">
          <span className="user-link" title={user?.email}>
            {user?.display_name || user?.email}
          </span>
          <button type="button" className="button-link" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
