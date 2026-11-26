import React from 'react';
import { Link } from 'react-router-dom';
import { Gauge, ShieldCheck, Wallet } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F4F3ED] text-[#171A18] lg:grid lg:grid-cols-12 dark:bg-[#0E100F] dark:text-[#F4F3ED]">
      {/* Left Graphite Editorial Panel */}
      <div className="hidden flex-col justify-between bg-[#171A18] p-12 text-white lg:col-span-5 lg:flex">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#C5F467] text-[#171A18]">
              <Gauge className="h-5 w-5" />
            </span>
            Vehixa
          </Link>
          <div className="mt-16 max-w-md space-y-4">
            <span className="inline-flex items-center rounded-[8px] bg-[#232724] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#C5F467]">
              Automotive Finance OS
            </span>
            <h1 className="text-3xl font-bold leading-tight text-white">
              Precision intelligence over every kilometre and every service record.
            </h1>
            <p className="text-sm leading-relaxed text-[#A6AAA3]">
              Manage motorcycles, scooters, cars, and electric vehicles in one ledger engineered for
              mileage analytics, document tracking, and transportation budgeting.
            </p>
          </div>
        </div>

        <div className="space-y-4 border-t border-[#2A2E2B] pt-8 text-sm">
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-[#C5F467]" />
            <div>
              <p className="font-semibold text-white">Unified Financial Ledger</p>
              <p className="text-xs text-[#A6AAA3]">
                Fuel, EV charging, repairs, and insurance reconciled to a single source of truth.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#C5F467]" />
            <div>
              <p className="font-semibold text-white">Private Ownership Isolation</p>
              <p className="text-xs text-[#A6AAA3]">
                JWT session rotation and strict per-account MongoDB isolation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:col-span-7">
        <div className="flex items-center justify-between lg:hidden">
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-extrabold text-[#171A18] dark:text-[#F4F3ED]">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#171A18] text-[#C5F467] dark:bg-[#C5F467] dark:text-[#171A18]">
              <Gauge className="h-4 w-4" />
            </span>
            Vehixa
          </Link>
        </div>

        <div className="mx-auto my-auto w-full max-w-md rounded-[14px] border border-[#E4E2D9] bg-white p-7 sm:p-9 dark:border-[#2B302C] dark:bg-[#171A18]">
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-[#171A18] dark:text-[#F4F3ED]">{title}</h2>
            <p className="mt-1.5 text-sm text-[#686D66] dark:text-[#A6AAA3]">{subtitle}</p>
          </div>
          {children}
        </div>

        <p className="text-center text-xs text-[#7D827A] dark:text-[#8E938B]">
          © {new Date().getFullYear()} Vehixa. Automotive Finance &amp; Mobility Intelligence.
        </p>
      </div>
    </div>
  );
}
