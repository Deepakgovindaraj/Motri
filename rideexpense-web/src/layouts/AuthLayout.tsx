import React from 'react';
import { Link } from 'react-router-dom';
import { Gauge, ShieldCheck, Wallet } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950 lg:grid lg:grid-cols-12">
      {/* Left Brand Panel */}
      <div className="hidden flex-col justify-between bg-navy-900 p-10 text-white lg:col-span-5 lg:flex">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-electric-600 text-white">
              <Gauge className="h-5 w-5" />
            </span>
            Vehixa
          </Link>
          <div className="mt-16 max-w-md space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-electric-500">
              Personal Vehicle Finance
            </p>
            <h1 className="text-3xl font-semibold leading-tight text-white">
              Clarity over every kilometre and every rupee or dollar spent.
            </h1>
            <p className="text-sm leading-relaxed text-slate-300">
              Manage motorcycles, scooters, cars, and EVs in one unified ledger—built for accurate
              mileage, maintenance planning, and transportation budgeting.
            </p>
          </div>
        </div>

        <div className="space-y-4 border-t border-navy-700 pt-8 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-electric-500" />
            <div>
              <p className="font-medium text-white">Single-source expense ledger</p>
              <p className="text-xs text-slate-400">
                Fuel, EV charging, servicing, and tolls reconciled per vehicle.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-electric-500" />
            <div>
              <p className="font-medium text-white">Private by architecture</p>
              <p className="text-xs text-slate-400">
                Token-verified ownership isolation and rotated refresh sessions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:col-span-7">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-lg font-bold text-navy-900 dark:text-white lg:hidden"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-electric-600 text-white">
              <Gauge className="h-4 w-4" />
            </span>
            Vehixa
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="mx-auto my-auto w-full max-w-md py-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
          </div>
          {children}
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-500">
          © {new Date().getFullYear()} Vehixa. Vehicle Expense &amp; Mobility Management.
        </p>
      </div>
    </div>
  );
}
