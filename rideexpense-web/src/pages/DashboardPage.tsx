import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  Car,
  Fuel,
  Loader2,
  PlusCircle,
  Receipt,
  Route,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { expenseService } from '../services/expenseService';
import { fuelService } from '../services/fuelService';
import { maintenanceService } from '../services/maintenanceService';
import { tripService } from '../services/tripService';
import { vehicleService } from '../services/vehicleService';
import {
  Expense,
  ExpenseCategory,
  MaintenanceReminder,
  Trip,
  Vehicle,
  VehicleRef,
} from '../types';
import { formatCurrency, formatDate, formatNumber, getApiErrorMessage } from '../utils/formatters';

export function DashboardPage() {
  const { user, preferences } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [totalSpend, setTotalSpend] = useState(0);
  const [averageMileage, setAverageMileage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [vehRes, tripRes, expRes, fuelRes, remRes] = await Promise.all([
          vehicleService.list({ limit: 50 }),
          tripService.list({ limit: 5 }),
          expenseService.list({ limit: 5 }),
          fuelService.list({ limit: 1 }),
          maintenanceService.getReminders(),
        ]);
        if (!active) return;
        setVehicles(vehRes.items);
        setTotalVehicles(vehRes.pagination.total);
        setRecentTrips(tripRes.items);
        setRecentExpenses(expRes.items);
        setTotalSpend(expRes.totalAmount);
        setAverageMileage(fuelRes.summary.averageMileage);
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

  const totalDistanceLogged = recentTrips.reduce((acc, t) => acc + (t.distance || 0), 0);
  const currency = preferences?.currency ?? 'USD';
  const distanceUnit = preferences?.distanceUnit ?? 'km';
  const fuelUnit = preferences?.fuelUnit ?? 'L';

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome, {user?.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Live overview powered by your MongoDB vehicles, trips, fuel, and expenses.
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

      {/* KPIs */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Total Expenses
            </span>
            <Receipt className="h-5 w-5 text-electric-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '—' : formatCurrency(totalSpend, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            All recorded categories
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Registered Vehicles
            </span>
            <Car className="h-5 w-5 text-electric-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '—' : totalVehicles}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Active garage count
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Average Mileage
            </span>
            <Fuel className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading
              ? '—'
              : averageMileage > 0
                ? `${formatNumber(averageMileage, 2)} ${distanceUnit}/${fuelUnit}`
                : 'N/A'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Full-tank-to-full-tank
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Recent Trips Distance
            </span>
            <Route className="h-5 w-5 text-electric-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {isLoading ? '—' : `${formatNumber(totalDistanceLogged, 1)} ${distanceUnit}`}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Across latest {recentTrips.length} trips
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Expenses */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Recent Expenses
            </h2>
            <Link
              to="/expenses"
              className="inline-flex items-center gap-1 text-sm font-medium text-electric-600 hover:underline"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-electric-600" /> Loading...
            </div>
          ) : recentExpenses.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No expenses recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {recentExpenses.map((exp) => {
                const cat = exp.categoryId as ExpenseCategory;
                const veh = exp.vehicleId as VehicleRef;
                return (
                  <div key={exp._id} className="flex items-center justify-between px-6 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {exp.description || cat?.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {veh?.vehicleName} · {formatDate(exp.expenseDate)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(exp.amount, exp.currency || currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent Trips */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Trips</h2>
            <Link
              to="/trips"
              className="inline-flex items-center gap-1 text-sm font-medium text-electric-600 hover:underline"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-electric-600" /> Loading...
            </div>
          ) : recentTrips.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No trips recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {recentTrips.map((trip) => {
                const veh = trip.vehicleId as VehicleRef;
                return (
                  <div key={trip._id} className="flex items-center justify-between px-6 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
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
      </div>

      {/* Upcoming Maintenance & Garage */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-electric-600" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Upcoming Maintenance
              </h2>
            </div>
            <Link
              to="/maintenance"
              className="inline-flex items-center gap-1 text-sm font-medium text-electric-600 hover:underline"
            >
              Manage <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {reminders.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No service reminders scheduled.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {reminders.map((rem) => (
                <div key={rem._id} className="flex items-center justify-between px-6 py-3.5">
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

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Your Garage</h2>
            <Link
              to="/vehicles"
              className="inline-flex items-center gap-1 text-sm font-medium text-electric-600 hover:underline"
            >
              Manage all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {vehicles.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No vehicles registered yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {vehicles.slice(0, 4).map((vehicle) => (
                <Link
                  key={vehicle._id}
                  to={`/vehicles/${vehicle._id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-navy-800/50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {vehicle.vehicleName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {vehicle.brand} {vehicle.model} · {vehicle.registrationNumber}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatNumber(vehicle.currentOdometer, 0)} {distanceUnit}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
