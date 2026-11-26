import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Car, FileText, Fuel, Gauge, Navigation } from 'lucide-react';

const capabilities = [
  {
    icon: Car,
    title: 'Garage Showcase',
    description: 'Manage motorcycles, scooters, cars, and EVs with live odometer and document status.',
  },
  {
    icon: Navigation,
    title: 'Interactive Trip Maps',
    description: 'Track routes via live GPS or manual odometer logs with automatic distance sync.',
  },
  {
    icon: Fuel,
    title: 'Fuel & Mileage Intelligence',
    description: 'Calculate true full-tank-to-full-tank mileage and cost per kilometre.',
  },
  {
    icon: BarChart3,
    title: 'Financial Ledger & Budgets',
    description: 'Categorized transaction history with 75%, 90%, and 100% threshold alerts.',
  },
  {
    icon: FileText,
    title: 'Document Vault',
    description: 'Monitor insurance, registration, PUC, and licence expiry timelines in one place.',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F4F3ED] text-[#171A18]">
      <header className="border-b border-[#E4E2D9] bg-[#F4F3ED]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#171A18] text-[#C5F467]">
              <Gauge className="h-5 w-5" />
            </span>
            Vehixa
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              className="rounded-[10px] px-4 py-2 text-sm font-semibold text-[#171A18] transition-colors hover:bg-[#E8E6DC]"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-[10px] bg-[#C5F467] px-4 py-2 text-sm font-semibold text-[#171A18] transition-colors hover:bg-[#B4E94D]"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1360px] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
        {/* Asymmetric Hero */}
        <div className="grid items-stretch gap-6 lg:grid-cols-12">
          <div className="flex flex-col justify-between rounded-[14px] border border-[#E4E2D9] bg-white p-8 sm:p-12 lg:col-span-7">
            <div>
              <span className="inline-flex items-center rounded-[8px] bg-[#DCE8D0] px-3 py-1 text-xs font-semibold text-[#23331A]">
                Bike Travel &amp; Expense Intelligence
              </span>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#171A18] sm:text-5xl">
                Every bike ride, petrol fill-up, and kilometre accounted for.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[#5C615A]">
                Built for riders and daily travel. Log petrol by amount paid, tap Start Ride to
                detect your route from start to destination, and calculate KMs driven, mileage, and
                every bike expense in one place.
              </p>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-[10px] bg-[#C5F467] px-6 py-3 text-sm font-semibold text-[#171A18] transition-colors hover:bg-[#B4E94D]"
              >
                Start Free Workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center rounded-[10px] border border-[#DCDAD0] bg-[#FAF9F5] px-6 py-3 text-sm font-semibold text-[#171A18] transition-colors hover:bg-[#EAE8DF]"
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* Graphite Contrast Feature Card */}
          <div className="flex flex-col justify-between rounded-[14px] bg-[#171A18] p-8 text-white sm:p-10 lg:col-span-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#C5F467]">
                Real-Time Cost Intelligence
              </p>
              <p className="mt-4 text-4xl font-bold tracking-tight tabular-nums text-white">
                100% MongoDB
              </p>
              <p className="mt-2 text-sm text-[#A6AAA3]">
                Single-source expense ledger with Decimal128 precision, full-tank mileage tracking,
                and automated budget threshold alerts.
              </p>
            </div>

            <div className="mt-8 space-y-3 border-t border-[#2B302C] pt-6 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#A6AAA3]">Supported Vehicles</span>
                <span className="font-semibold text-white">Cars · Bikes · Scooters · EVs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A6AAA3]">Budget Thresholds</span>
                <span className="rounded-[6px] bg-[#C5F467] px-2 py-0.5 text-xs font-bold text-[#171A18]">
                  75% · 90% · 100%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#A6AAA3]">Trip Modes</span>
                <span className="font-semibold text-white">Manual Odometer &amp; Live GPS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Capabilities Strip */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {capabilities.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-[12px] border border-[#E4E2D9] bg-white p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#F4F3ED] text-[#171A18]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-[#171A18]">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#5C615A]">{description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
