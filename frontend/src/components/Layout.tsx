import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext';

const NAV = [{ to: '/', label: 'Library', end: true }];

export default function Layout() {
  const { user, signOut } = useAuth();

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
