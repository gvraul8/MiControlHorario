import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import BrandMark from './BrandMark';
import TabIcon from './TabIcons';
import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

const tabs = [
  { to: '/', label: 'Calendario', icon: 'calendar' as const },
  { to: '/trabajos', label: 'Trabajos', icon: 'jobs' as const },
  { to: '/estadisticas', label: 'Estadísticas', icon: 'stats' as const },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const { signOut, user } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-brand">
          <BrandMark variant="header" subtitle={user?.email ?? undefined} />
        </div>
        <div className="app-header-actions">
          <Link to="/cuenta" className="btn btn-ghost">
            Cuenta
          </Link>
          <button type="button" className="btn btn-ghost" onClick={() => signOut()}>
            Salir
          </button>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <nav className="tab-bar">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) => `tab-link${isActive ? ' active' : ''}`}
          >
            <TabIcon name={tab.icon} className="tab-icon" />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
