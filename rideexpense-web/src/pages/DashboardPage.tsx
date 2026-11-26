import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  Car,
  Fuel,
  Gauge,
  Loader2,
  PlusCircle,
  Receipt,
  Route,
  Wallet,
  Wrench,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { analyticsService } from '../services/analyticsService';
import { budgetService } from '../services/budgetService';
import { expenseService } from '../services/expenseService';
import { maintenanceService } from '../services/maintenanceService';
import { tripService } from '../services/tripService';
import {
  BudgetProgress,
  DashboardAnalytics,
  Expense,
  ExpenseCategory,
  MaintenanceReminder,
  Trip,
  VehicleRef,
} from '../types';
import { formatCurrency, formatDate, formatNumber, getApiErrorMessage } from '../utils/formatters';

export function DashboardPage() {
  const { user, preferences } = useAuth();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [dashRes, budgetRes, tripRes, expRes, remRes] = await Promise.all([
          analyticsService.getDashboard(),
          budgetService.getProgress(),
          tripService.list({ limit: 5 }),
          expenseService.list({ limit: 5 }),
          maintenanceService.getReminders(),
        ]);
        if (!active) return;
        setAnalytics(dashRes);
        setBudgets(budgetRes);
        setRecentTrips(tripRes.items);
        setRecentExpenses(expRes.items);
        setReminders(remRes.slice(0, 4));
      } catch (err) {
        if (!active) return;
        setError(getApiErrorMessage(err, 'Unable to load dashboard overview'));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const currency = preferences?.currency ?? 'USD';
  const distanceUnit = preferences?.distanceUnit ?? 'km';
  const fuelUnit = preferences?.fuelUnit ?? 'L';
  const s = analytics?.summary;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome, {user?.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Live financial and operational overview from MongoDB.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/expenses"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-200 dark:hover:bg-navy-800"
          >
            <Receipt className="h-4 w-4 text-electric-600" />
            Add Expense
          </Link>
          <Link
            to="/vehicles/new"
            className="inline-flex items-center gap-2 rounded-lg bg-electric-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-electric-700"
          >
            <PlusCircle className="h-4 w-4" />
            Register Vehicle
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Time-period spend KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Today&apos;s Expenses
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '—' : formatCurrency(s?.todayExpenses ?? 0, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Weekly Expenses
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '—' : formatCurrency(s?.weeklyExpenses ?? 0, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Monthly Expenses
          </p>
          <p className="mt-2 text-2xl font-bold text-electric-600 dark:text-blue-400">
            {isLoading ? '—' : formatCurrency(s?.monthlyExpenses ?? 0, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Annual Expenses
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '—' : formatCurrency(s?.annualExpenses ?? 0, currency)}
          </p>
        </Card>
      </div>

      {/* Operational & Efficiency KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Distance</span>
            <Route className="h-4 w-4 text-electric-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '—' : `${formatNumber(s?.totalDistance ?? 0, 1)} ${distanceUnit}`}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Fuel Spend</span>
            <Fuel className="h-4 w-4 text-electric-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '—' : formatCurrency(s?.fuelExpenditure ?? 0, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Maintenance</span>
            <Wrench className="h-4 w-4 text-electric-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '—' : formatCurrency(s?.maintenanceExpenditure ?? 0, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Avg Mileage</span>
            <Gauge className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {isLoading
              ? '—'
              : (s?.averageMileage ?? 0) > 0
                ? `${formatNumber(s!.averageMileage, 1)} ${distanceUnit}/${fuelUnit}`
                : 'N/A'}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Cost / {distanceUnit}</span>
            <Wallet className="h-4 w-4 text-electric-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '—' : formatCurrency(s?.costPerKm ?? 0, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Vehicles</span>
            <Car className="h-4 w-4 text-electric-600" />
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '—' : s?.registeredVehicleCount ?? 0}
          </p>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Monthly Expenditure
            </h2>
            <Link to="/analytics" className="text-xs font-semibold text-electric-600 hover:underline">
              Full Analytics
            </Link>
          </div>
          <div className="h-64 w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-electric-600" /> Loading chart...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.monthlyChart ?? []}>
                  <defs>
                    <linearGradient id="vehixaBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val, currency)} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fill="url(#vehixaBlue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Expense Categories
          </h2>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-electric-600" />
            </div>
          ) : (analytics?.categoryDistribution ?? []).length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-500">
              No category spend yet.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics?.categoryDistribution ?? []}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {(analytics?.categoryDistribution ?? []).map((entry) => (
                      <Cell key={entry.categoryId} fill={entry.color || '#2563EB'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val, currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Vehicle-wise Expenses & Budgets */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Vehicle-wise Expenses
          </h2>
          {(analytics?.vehicleExpenses ?? []).length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-slate-500">
              No vehicle expenses recorded yet.
            </div>
          ) : (
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.vehicleExpenses ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="vehicleName" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val, currency)} />
                  <Bar dataKey="amount" fill="#0B192C" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Budget Progress
            </h2>
            <Link to="/budgets" className="text-xs font-semibold text-electric-600 hover:underline">
              Manage Budgets
            </Link>
          </div>
          {budgets.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center text-center text-sm text-slate-500">
              <p>No active budgets configured.</p>
              <Link to="/budgets" className="mt-2 font-semibold text-electric-600 hover:underline">
                Create a budget
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {budgets.slice(0, 4).map((b) => {
                const barColor =
                  b.alertLevel === 'exceeded_100'
                    ? 'bg-red-600'
                    : b.alertLevel === 'critical_90'
                      ? 'bg-orange-500'
                      : b.alertLevel === 'warning_75'
                        ? 'bg-amber-500'
                        : 'bg-electric-600';
                return (
                  <div key={b._id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {b.vehicle?.vehicleName || b.category?.name || 'Overall'} ({b.period})
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        {formatCurrency(b.amountSpent, currency)} /{' '}
                        {formatCurrency(b.totalBudget, currency)} ({b.spendingPercentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-navy-800">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.min(100, b.spendingPercentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity & Reminders */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Expenses</h2>
            <Link to="/expenses" className="inline-flex items-center gap-1 text-xs font-medium text-electric-600 hover:underline">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentExpenses.length === 0 ? (
            <p className="px-6 py-8 text-center text-xs text-slate-500">No expenses yet.</p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {recentExpenses.map((exp) => {
                const cat = exp.categoryId as ExpenseCategory;
                const veh = exp.vehicleId as VehicleRef;
                return (
                  <div key={exp._id} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {exp.description || cat?.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {veh?.vehicleName} · {formatDate(exp.expenseDate)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(exp.amount, exp.currency || currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Trips</h2>
            <Link to="/trips" className="inline-flex items-center gap-1 text-xs font-medium text-electric-600 hover:underline">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recentTrips.length === 0 ? (
            <p className="px-6 py-8 text-center text-xs text-slate-500">No trips yet.</p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {recentTrips.map((trip) => {
                const veh = trip.vehicleId as VehicleRef;
                return (
                  <div key={trip._id} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {trip.startLocation || 'Origin'} → {trip.endLocation || 'Destination'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {veh?.vehicleName} · {formatDate(trip.startTime)}
                      </p>
                    </div>
                    <Badge variant="blue">
                      {formatNumber(trip.distance, 1)} {distanceUnit}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <BellRing className="h-4 w-4 text-electric-600" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Upcoming Maintenance
              </h2>
            </div>
            <Link to="/maintenance" className="inline-flex items-center gap-1 text-xs font-medium text-electric-600 hover:underline">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {reminders.length === 0 ? (
            <p className="px-6 py-8 text-center text-xs text-slate-500">No upcoming reminders.</p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {reminders.map((rem) => (
                <div key={rem._id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {rem.vehicle.vehicleName} · {rem.serviceType}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {rem.reasons.join(' · ') || 'Scheduled'}
                    </p>
                  </div>
                  <Badge
                    variant={
                      rem.status === 'overdue'
                        ? 'red'
                        : rem.status === 'due_soon'
                          ? 'amber'
                          : 'neutral'
                    }
                  >
                    {rem.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
