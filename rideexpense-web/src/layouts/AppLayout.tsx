import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Car,
  Fuel,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Navigation,
  PiggyBank,
  PlusCircle,
  Receipt,
  Route as RouteIcon,
  User as UserIcon,
  Wrench,
  X,
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/vehicles', label: 'Vehicles', icon: Car },
  { to: '/trips', label: 'Trips', icon: RouteIcon },
  { to: '/gps-tracking', label: 'GPS Tracking', icon: Navigation },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/fuel', label: 'Fuel & EV', icon: Fuel },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/profile', label: 'Profile & Settings', icon: UserIcon },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const renderNavLinks = (onNavigate?: () => void) => (
    <nav className="space-y-1 px-3">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/vehicles'}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-electric-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-navy-800 hover:text-white'
            }`
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-navy-950">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-navy-900 text-white lg:flex">
        <div>
          <div className="flex h-16 items-center gap-2.5 border-b border-navy-800 px-6">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-electric-600 text-white">
              <Gauge className="h-4 w-4" />
            </span>
            <Link to="/dashboard" className="text-lg font-bold tracking-tight">
              Motri
            </Link>
          </div>
          <div className="py-6">{renderNavLinks()}</div>
        </div>

        <div className="border-t border-navy-800 p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-700 text-sm font-semibold text-white">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-navy-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex w-64 flex-col justify-between bg-navy-900 text-white">
            <div>
              <div className="flex h-16 items-center justify-between border-b border-navy-800 px-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-electric-600 text-white">
                    <Gauge className="h-4 w-4" />
                  </span>
                  <span className="text-lg font-bold">Motri</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="py-6">{renderNavLinks(() => setMobileOpen(false))}</div>
            </div>
            <div className="border-t border-navy-800 p-4">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-navy-800 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-navy-900/95 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-navy-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Motri · Mobility, Operations, Tracking, Records &amp; Insights
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/vehicles/new"
              className="hidden items-center gap-1.5 rounded-lg bg-electric-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-electric-700 sm:inline-flex"
            >
              <PlusCircle className="h-4 w-4" />
              Add Vehicle
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
