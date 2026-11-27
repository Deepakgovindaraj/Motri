import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Car,
  CheckCheck,
  ChevronDown,
  FileText,
  Fuel,
  Gauge,
  LayoutGrid,
  LogOut,
  Moon,
  MoreHorizontal,
  PiggyBank,
  Receipt,
  RefreshCw,
  Route as RouteIcon,
  Settings,
  Smartphone,
  Sun,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePwa } from '../context/PwaContext';
import { useTheme } from '../context/ThemeContext';
import { notificationService } from '../services/notificationService';
import { AppNotification } from '../types';
import { formatDate } from '../utils/formatters';

const primaryNav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { to: '/vehicles', label: 'Vehicles', icon: Car },
  { to: '/trips', label: 'Trips', icon: RouteIcon },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
  { to: '/documents', label: 'Documents', icon: FileText },
];

const secondaryNav = [
  { to: '/fuel', label: 'Fuel & EV', icon: Fuel },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const {
    canInstall,
    updateReady,
    promptDismissed,
    installApp,
    dismissPrompt,
    applyUpdate,
  } = usePwa();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const res = await notificationService.list();
      setNotifications(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      // Ignore silent notification polling error
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    await notificationService.markRead(id);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isRouteActive = (path: string) => {
    if (path === '/expenses') {
      return (
        location.pathname.startsWith('/expenses') ||
        location.pathname.startsWith('/fuel') ||
        location.pathname.startsWith('/maintenance')
      );
    }
    if (path === '/insights') {
      return (
        location.pathname.startsWith('/insights') ||
        location.pathname.startsWith('/analytics') ||
        location.pathname.startsWith('/budgets')
      );
    }
    if (path === '/trips') {
      return (
        location.pathname.startsWith('/trips') ||
        location.pathname.startsWith('/gps-tracking')
      );
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#F4F3ED] text-[#171A18] pb-20 transition-colors lg:pb-0 dark:bg-[#0E100F] dark:text-[#F4F3ED]">
      {/* Sticky Horizontal Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#E4E2D9] bg-[#F4F3ED]/95 backdrop-blur-md dark:border-[#2B302C] dark:bg-[#0E100F]/95">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          {/* Left: Brand Logo */}
          <Link to="/dashboard" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#171A18] text-[#C5F467] dark:bg-[#C5F467] dark:text-[#171A18]">
              <Gauge className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-[#171A18] dark:text-[#F4F3ED]">Vehixa</span>
          </Link>

          {/* Center: Horizontal Navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 rounded-[12px] border border-[#E4E2D9] bg-white p-1 lg:flex dark:border-[#2B302C] dark:bg-[#171A18]"
          >
            {primaryNav.map((item) => {
              const active = isRouteActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-[9px] px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[#171A18] text-[#C5F467] dark:bg-[#C5F467] dark:text-[#171A18]'
                      : 'text-[#5C615A] hover:bg-[#F4F3ED] hover:text-[#171A18] dark:text-[#A6AAA3] dark:hover:bg-[#232724] dark:hover:text-[#F4F3ED]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Notifications, Settings, Profile */}
          <div className="flex items-center gap-2">
            {/* Notifications Dropdown */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setProfileOpen(false);
                }}
                aria-label="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#E4E2D9] bg-white text-[#171A18] transition-colors hover:bg-[#FAF9F5] dark:border-[#2B302C] dark:bg-[#171A18] dark:text-[#F4F3ED] dark:hover:bg-[#1E221F]"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#C5F467] px-1 text-[10px] font-bold text-[#171A18]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-[12px] border border-[#E4E2D9] bg-white shadow-lg sm:w-96 dark:border-[#2B302C] dark:bg-[#171A18]">
                  <div className="flex items-center justify-between border-b border-[#ECEAE2] px-4 py-3 dark:border-[#262B27]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#171A18] dark:text-[#F4F3ED]">
                      Notifications ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#171A18] hover:underline dark:text-[#C5F467]"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 divide-y divide-[#ECEAE2] overflow-y-auto dark:divide-[#262B27]">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-xs text-[#7D827A] dark:text-[#8E938B]">
                        No alerts yet. Budget thresholds and reminders appear here.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => !n.isRead && void handleMarkRead(n._id)}
                          className={`cursor-pointer px-4 py-3 transition-colors hover:bg-[#FAF9F5] dark:hover:bg-[#1E221F] ${
                            n.isRead ? 'opacity-65' : 'bg-[#FAF9F5] dark:bg-[#1E221F]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-[#171A18] dark:text-[#F4F3ED]">{n.title}</p>
                            {!n.isRead && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#C5F467] ring-1 ring-[#171A18]" />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-[#5C615A] dark:text-[#B0B4AD]">{n.body}</p>
                          <p className="mt-1 text-[10px] text-[#A6AAA3]">{formatDate(n.createdAt)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings link */}
            <Link
              to="/settings"
              aria-label="Settings"
              className={`hidden h-9 w-9 items-center justify-center rounded-[10px] border transition-colors sm:flex ${
                location.pathname.startsWith('/settings') || location.pathname.startsWith('/profile')
                  ? 'border-[#171A18] bg-[#171A18] text-[#C5F467] dark:border-[#C5F467] dark:bg-[#C5F467] dark:text-[#171A18]'
                  : 'border-[#E4E2D9] bg-white text-[#171A18] hover:bg-[#FAF9F5] dark:border-[#2B302C] dark:bg-[#171A18] dark:text-[#F4F3ED] dark:hover:bg-[#1E221F]'
              }`}
            >
              <Settings className="h-4 w-4" />
            </Link>

            {/* Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen((o) => !o);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-[10px] border border-[#E4E2D9] bg-white py-1 pl-1.5 pr-2.5 text-left transition-colors hover:bg-[#FAF9F5] dark:border-[#2B302C] dark:bg-[#171A18] dark:hover:bg-[#1E221F]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#171A18] text-xs font-bold text-[#C5F467] dark:bg-[#C5F467] dark:text-[#171A18]">
                  {user?.name?.charAt(0).toUpperCase() || 'V'}
                </span>
                <span className="hidden max-w-[110px] truncate text-xs font-semibold text-[#171A18] md:block dark:text-[#F4F3ED]">
                  {user?.name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#7D827A]" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-[12px] border border-[#E4E2D9] bg-white py-1.5 shadow-lg dark:border-[#2B302C] dark:bg-[#171A18]">
                  <div className="border-b border-[#ECEAE2] px-4 py-2.5 dark:border-[#262B27]">
                    <p className="truncate text-sm font-semibold text-[#171A18] dark:text-[#F4F3ED]">{user?.name}</p>
                    <p className="truncate text-xs text-[#7D827A] dark:text-[#8E938B]">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    {secondaryNav.map(({ to, label, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#171A18] hover:bg-[#F4F3ED] dark:text-[#F4F3ED] dark:hover:bg-[#232724]"
                      >
                        <Icon className="h-4 w-4 text-[#5C615A] dark:text-[#A6AAA3]" />
                        {label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-[#171A18] hover:bg-[#F4F3ED] dark:text-[#F4F3ED] dark:hover:bg-[#232724]"
                    >
                      <span className="flex items-center gap-2.5">
                        {isDark ? (
                          <Sun className="h-4 w-4 text-[#C5F467]" />
                        ) : (
                          <Moon className="h-4 w-4 text-[#5C615A]" />
                        )}
                        Night Mode
                      </span>
                      <span
                        className={`rounded-[6px] px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isDark
                            ? 'bg-[#C5F467] text-[#171A18]'
                            : 'bg-[#F4F3ED] text-[#5C615A]'
                        }`}
                      >
                        {isDark ? 'On' : 'Off'}
                      </span>
                    </button>
                    {canInstall && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          void installApp();
                        }}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm font-semibold text-[#171A18] hover:bg-[#F4F3ED] dark:text-[#C5F467] dark:hover:bg-[#232724]"
                      >
                        <Smartphone className="h-4 w-4" />
                        Install Vehixa App
                      </button>
                    )}
                  </div>
                  <div className="border-t border-[#ECEAE2] pt-1 dark:border-[#262B27]">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm font-medium text-[#B42318] hover:bg-[#FEF3F2] dark:text-[#FCA5A5] dark:hover:bg-[#2B1514]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Container */}
      <main className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        {updateReady && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#262A27] bg-[#171A18] px-4 py-3 text-white">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <RefreshCw className="h-4 w-4 text-[#C5F467]" />
              <span>A newer version of Vehixa is ready.</span>
            </div>
            <button
              type="button"
              onClick={applyUpdate}
              className="rounded-[8px] bg-[#C5F467] px-3 py-1.5 text-xs font-bold text-[#171A18] hover:bg-[#B4E94D]"
            >
              Update Now
            </button>
          </div>
        )}

        {canInstall && !promptDismissed && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#C5D8B3] bg-[#DCE8D0] px-4 py-3 text-[#171A18] dark:border-[#2F4726] dark:bg-[#1B2816] dark:text-[#F4F3ED]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#171A18] text-[#C5F467]">
                <Smartphone className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold sm:text-sm">Install Vehixa as an App</p>
                <p className="text-[11px] text-[#23331A] dark:text-[#B0B4AD]">
                  Full-screen ride tracking, home-screen shortcuts &amp; offline GPS resilience.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void installApp()}
                className="rounded-[8px] bg-[#171A18] px-3.5 py-1.5 text-xs font-bold text-[#C5F467] hover:bg-[#232724] dark:bg-[#C5F467] dark:text-[#171A18]"
              >
                Install
              </button>
              <button
                type="button"
                onClick={dismissPrompt}
                aria-label="Dismiss install prompt"
                className="rounded-[8px] p-1 text-[#23331A] hover:bg-black/5 dark:text-[#A6AAA3] dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E4E2D9] bg-white/95 backdrop-blur-md lg:hidden dark:border-[#2B302C] dark:bg-[#171A18]/95"
      >
        <div className="grid grid-cols-5 px-2 py-1.5">
          {primaryNav.slice(0, 4).map(({ to, label, icon: Icon }) => {
            const active = isRouteActive(to);
            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center justify-center gap-1 rounded-[10px] py-1.5 text-[11px] font-semibold"
              >
                <span
                  className={`flex h-7 w-10 items-center justify-center rounded-full transition-colors ${
                    active ? 'bg-[#C5F467] text-[#171A18]' : 'text-[#5C615A] dark:text-[#A6AAA3]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className={active ? 'text-[#171A18] dark:text-[#C5F467]' : 'text-[#7D827A] dark:text-[#8E938B]'}>
                  {label}
                </span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-1 rounded-[10px] py-1.5 text-[11px] font-semibold text-[#5C615A] dark:text-[#A6AAA3]"
          >
            <span className="flex h-7 w-10 items-center justify-center rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </span>
            <span className="text-[#7D827A] dark:text-[#8E938B]">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile Secondary Menu Sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-[1100] flex items-end bg-[#171A18]/50 lg:hidden dark:bg-black/70">
          <div className="w-full rounded-t-[18px] border-t border-[#E4E2D9] bg-white p-5 pb-8 dark:border-[#2B302C] dark:bg-[#171A18]">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold text-[#171A18] dark:text-[#F4F3ED]">More Sections</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-lg p-1.5 text-[#5C615A] hover:bg-[#F4F3ED] dark:text-[#A6AAA3] dark:hover:bg-[#232724]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { to: '/insights', label: 'Insights', icon: BarChart3 },
                { to: '/documents', label: 'Documents', icon: FileText },
                ...secondaryNav,
              ].map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2.5 rounded-[10px] border border-[#E4E2D9] bg-[#FAF9F5] px-3.5 py-3 text-sm font-semibold text-[#171A18] dark:border-[#2B302C] dark:bg-[#1E221F] dark:text-[#F4F3ED]"
                >
                  <Icon className="h-4 w-4 text-[#171A18] dark:text-[#C5F467]" />
                  {label}
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="mt-3 flex w-full items-center justify-between rounded-[10px] border border-[#E4E2D9] bg-[#FAF9F5] px-4 py-3 text-sm font-semibold text-[#171A18] dark:border-[#2B302C] dark:bg-[#1E221F] dark:text-[#F4F3ED]"
            >
              <span className="flex items-center gap-2.5">
                {isDark ? <Sun className="h-4 w-4 text-[#C5F467]" /> : <Moon className="h-4 w-4" />}
                Night Mode
              </span>
              <span
                className={`rounded-[6px] px-2.5 py-0.5 text-xs font-bold ${
                  isDark ? 'bg-[#C5F467] text-[#171A18]' : 'bg-[#E4E2D9] text-[#5C615A]'
                }`}
              >
                {isDark ? 'On' : 'Off'}
              </span>
            </button>
            {canInstall && (
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  void installApp();
                }}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#C5F467] px-4 py-3 text-sm font-bold text-[#171A18]"
              >
                <Smartphone className="h-4 w-4" />
                Install Vehixa App
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
