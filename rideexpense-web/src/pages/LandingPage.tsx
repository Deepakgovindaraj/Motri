import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Car,
  ClipboardList,
  Gauge,
  Navigation,
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

const motriPillars = [
  {
    letter: 'M',
    title: 'Mobility',
    subtitle: 'Vehicle & ride management',
    icon: Car,
    description:
      'Register motorcycles, scooters, cars, and EVs with specifications, registration numbers, and odometer history.',
  },
  {
    letter: 'O',
    title: 'Operations',
    subtitle: 'Daily vehicle activities',
    icon: Activity,
    description:
      'Streamline everyday vehicle readiness, service schedules, insurance renewals, and odometer milestones.',
  },
  {
    letter: 'T',
    title: 'Tracking',
    subtitle: 'GPS, trips & mileage',
    icon: Navigation,
    description:
      'Capture manual odometer trips or live GPS routes with accuracy filtering and full-tank mileage calculation.',
  },
  {
    letter: 'R',
    title: 'Records',
    subtitle: 'Fuel, maintenance & expenses',
    icon: ClipboardList,
    description:
      'Maintain one unified financial ledger across fuel, EV charging, repairs, tolls, parking, and servicing.',
  },
  {
    letter: 'I',
    title: 'Insights',
    subtitle: 'Analytics, budgets & cost reports',
    icon: BarChart3,
    description:
      'Monitor cost per kilometre, category spend, and transportation budgets with clear financial reporting.',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-navy-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-navy-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-electric-600 text-white">
              <Gauge className="h-5 w-5" />
            </span>
            Motri
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-navy-800"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-lg bg-electric-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-electric-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-8 lg:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-electric-700 dark:border-blue-900/70 dark:bg-blue-950/60 dark:text-blue-300">
              Mobility · Operations · Tracking · Records · Insights
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-navy-900 dark:text-white sm:text-5xl">
              Motri: Every kilometre, fill-up, and service record accounted for.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Motri is a unified financial workspace for personal vehicles. Manage daily vehicle
              operations, log trips and fuel fill-ups, and gain clarity over your true cost of
              mobility.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-electric-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-electric-700"
              >
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-200 dark:hover:bg-navy-800"
              >
                Sign in to dashboard
              </Link>
            </div>
          </div>

          <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {motriPillars.map(({ letter, title, subtitle, icon: Icon, description }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-navy-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-electric-600 dark:bg-blue-950/60 dark:text-blue-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold tracking-widest text-electric-600 dark:text-blue-400">
                    {letter}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
                  {title}
                </h3>
                <p className="text-xs font-medium text-electric-600 dark:text-blue-400">
                  {subtitle}
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
