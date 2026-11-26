import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Car,
  FileWarning,
  Fuel,
  Loader2,
  Plus,
  Receipt,
  Route,
  Square,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StartRideModal } from '../components/StartRideModal';
import { StopRideModal } from '../components/StopRideModal';
import { VehicleVisual } from '../components/VehicleVisual';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { useAuth } from '../context/AuthContext';
import { useRide } from '../context/RideContext';
import { analyticsService } from '../services/analyticsService';
import { budgetService } from '../services/budgetService';
import { documentService } from '../services/documentService';
import { expenseService } from '../services/expenseService';
import { fuelService } from '../services/fuelService';
import { maintenanceService } from '../services/maintenanceService';
import { tripService } from '../services/tripService';
import { vehicleService } from '../services/vehicleService';
import {
  BudgetProgress,
  DashboardAnalytics,
  Expense,
  ExpenseCategory,
  MaintenanceReminder,
  PaymentMethod,
  ServiceType,
  Trip,
  Vehicle,
  VehicleDocumentItem,
  VehicleRef,
} from '../types';
import { formatCurrency, formatDate, formatNumber, getApiErrorMessage } from '../utils/formatters';

type QuickActionKind = 'trip' | 'expense' | 'fuel' | 'maintenance' | null;

export function DashboardPage() {
  const { user, preferences } = useAuth();
  const {
    activeRide,
    liveDistanceKm,
    elapsedSeconds,
    lastCompletedRide,
    clearLastCompletedRide,
    lastPetrolPrice,
  } = useRide();
  const navigate = useNavigate();

  const [showStartRide, setShowStartRide] = useState(false);
  const [showStopRide, setShowStopRide] = useState(false);

  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [documents, setDocuments] = useState<VehicleDocumentItem[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick action modal state
  const [quickModal, setQuickModal] = useState<QuickActionKind>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  const [qaVehicleId, setQaVehicleId] = useState('');
  const [qaAmount, setQaAmount] = useState('');
  const [qaCategoryId, setQaCategoryId] = useState('');
  const [qaDescription, setQaDescription] = useState('');
  const [qaPaymentMethod, setQaPaymentMethod] = useState<PaymentMethod>('Card');
  const [qaStartLoc, setQaStartLoc] = useState('');
  const [qaEndLoc, setQaEndLoc] = useState('');
  const [qaStartOdo, setQaStartOdo] = useState('');
  const [qaEndOdo, setQaEndOdo] = useState('');
  const [qaFuelType, setQaFuelType] = useState<'Petrol' | 'Diesel' | 'CNG' | 'EV charging'>('Petrol');
  const [qaQty, setQaQty] = useState('');
  const [qaUnitPrice, setQaUnitPrice] = useState('');
  const [qaOdometer, setQaOdometer] = useState('');
  const [qaServiceType, setQaServiceType] = useState<ServiceType>('Servicing');

  const loadDashboard = useCallback(async () => {
    setError(null);
    const vehicleFilter = selectedVehicleId || undefined;
    try {
      const [dashRes, vehRes, budgetRes, tripRes, expRes, remRes, docRes, catRes] =
        await Promise.all([
          analyticsService.getDashboard(vehicleFilter),
          vehicleService.list({ limit: 50 }),
          budgetService.getProgress(),
          tripService.list({ vehicleId: vehicleFilter, limit: 8 }),
          expenseService.list({ vehicleId: vehicleFilter, limit: 8 }),
          maintenanceService.getReminders(),
          documentService.list({ vehicleId: vehicleFilter }),
          expenseService.getCategories(),
        ]);
      setAnalytics(dashRes);
      setVehicles(vehRes.items);
      setBudgets(
        vehicleFilter
          ? budgetRes.filter((b) => !b.vehicle || b.vehicle._id === vehicleFilter)
          : budgetRes,
      );
      setRecentTrips(tripRes.items);
      setRecentExpenses(expRes.items);
      setReminders(
        vehicleFilter ? remRes.filter((r) => r.vehicle._id === vehicleFilter) : remRes,
      );
      setDocuments(docRes);
      setCategories(catRes);

      if (vehRes.items.length > 0) {
        setQaVehicleId((prev) => prev || vehRes.items[0]._id);
      }
      if (catRes.length > 0) {
        setQaCategoryId((prev) => prev || catRes[0]._id);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load overview data'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedVehicleId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const activeVehicle = useMemo(
    () => vehicles.find((v) => v._id === selectedVehicleId) ?? vehicles[0] ?? null,
    [vehicles, selectedVehicleId],
  );

  const openQuickModal = (kind: QuickActionKind) => {
    if (vehicles.length === 0) {
      navigate('/vehicles/new');
      return;
    }
    const targetVeh = activeVehicle ?? vehicles[0];
    setQaVehicleId(targetVeh._id);
    setQaStartOdo(String(targetVeh.currentOdometer));
    setQaEndOdo(String(targetVeh.currentOdometer));
    setQaOdometer(String(targetVeh.currentOdometer));
    setQaAmount('');
    setQaDescription('');
    setQaQty('');
    setQaUnitPrice(kind === 'fuel' ? lastPetrolPrice : '');
    setModalError(null);
    setQuickModal(kind);
  };

  const submitQuickAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSaving(true);
    setModalError(null);
    try {
      if (quickModal === 'trip') {
        await tripService.createManual({
          vehicleId: qaVehicleId,
          startLocation: qaStartLoc || undefined,
          endLocation: qaEndLoc || undefined,
          startOdometer: Number(qaStartOdo),
          endOdometer: Number(qaEndOdo),
          purpose: 'Commute',
        });
      } else if (quickModal === 'expense') {
        await expenseService.create({
          vehicleId: qaVehicleId,
          categoryId: qaCategoryId,
          amount: Number(qaAmount),
          paymentMethod: qaPaymentMethod,
          description: qaDescription || undefined,
        });
      } else if (quickModal === 'fuel') {
        await fuelService.create({
          vehicleId: qaVehicleId,
          fuelType: qaFuelType,
          totalAmount: Number(qaQty),
          unitPrice: Number(qaUnitPrice),
          odometer: Number(qaOdometer),
          isFullTank: true,
          paymentMethod: qaPaymentMethod,
        });
      } else if (quickModal === 'maintenance') {
        await maintenanceService.create({
          vehicleId: qaVehicleId,
          serviceType: qaServiceType,
          amount: Number(qaAmount),
          odometer: Number(qaOdometer),
          paymentMethod: qaPaymentMethod,
          notes: qaDescription || undefined,
        });
      }
      setQuickModal(null);
      await loadDashboard();
    } catch (err) {
      setModalError(getApiErrorMessage(err, 'Failed to save entry'));
    } finally {
      setModalSaving(false);
    }
  };

  // Month-over-month comparison from monthlyChart
  const monthSeries = analytics?.monthlyChart ?? [];
  const currentMonthVal = monthSeries[monthSeries.length - 1]?.amount ?? 0;
  const prevMonthVal = monthSeries[monthSeries.length - 2]?.amount ?? 0;
  const momDeltaPct =
    prevMonthVal > 0
      ? Number((((currentMonthVal - prevMonthVal) / prevMonthVal) * 100).toFixed(1))
      : null;

  // Next maintenance date for spotlight vehicle
  const activeVehicleReminder = reminders.find((r) => r.vehicle._id === activeVehicle?._id);

  // Merged chronological activity timeline (Trips + Expenses)
  const timeline = useMemo(() => {
    const tripEvents = recentTrips.map((t) => ({
      id: `trip-${t._id}`,
      kind: 'trip' as const,
      date: new Date(t.startTime).getTime(),
      dateStr: t.startTime,
      title: `${t.startLocation || 'Origin'} → ${t.endLocation || 'Destination'}`,
      subtitle: `${(t.vehicleId as VehicleRef)?.vehicleName ?? 'Vehicle'} · ${t.purpose || t.trackingType}`,
      metric: `${formatNumber(t.distance, 1)} ${preferences?.distanceUnit ?? 'km'}`,
    }));
    const expenseEvents = recentExpenses.map((e) => ({
      id: `exp-${e._id}`,
      kind: 'expense' as const,
      date: new Date(e.expenseDate).getTime(),
      dateStr: e.expenseDate,
      title: e.description || (e.categoryId as ExpenseCategory)?.name || 'Expense',
      subtitle: `${(e.vehicleId as VehicleRef)?.vehicleName ?? 'Vehicle'} · ${e.paymentMethod}`,
      metric: formatCurrency(e.amount, e.currency || preferences?.currency || 'USD'),
    }));
    return [...tripEvents, ...expenseEvents].sort((a, b) => b.date - a.date).slice(0, 7);
  }, [recentTrips, recentExpenses, preferences]);

  // Expiring documents within 30 days or expired
  const expiringDocs = useMemo(() => {
    const cutoff = Date.now() + 30 * 86400 * 1000;
    return documents.filter((d) => d.expiryDate && new Date(d.expiryDate).getTime() <= cutoff);
  }, [documents]);

  const currency = preferences?.currency ?? 'USD';
  const distanceUnit = preferences?.distanceUnit ?? 'km';
  const fuelUnit = preferences?.fuelUnit ?? 'L';
  const s = analytics?.summary;

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-8">
      {/* Section A – Welcome Area */}
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.09em] text-[#7D827A]">
            {todayFormatted}
          </p>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[#171A18] sm:text-3xl">
            Good day, {user?.name?.split(' ')[0] || 'Driver'}
          </h1>
          <p className="mt-1 text-sm text-[#5C615A]">
            Live vehicle finance, distance telemetry, and maintenance status across your garage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {vehicles.length > 0 && (
            <div className="min-w-[200px]">
              <Select
                aria-label="Selected vehicle"
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                options={[
                  { label: `All Vehicles (${vehicles.length})`, value: '' },
                  ...vehicles.map((v) => ({
                    label: `${v.vehicleName} · ${v.registrationNumber}`,
                    value: v._id,
                  })),
                ]}
              />
            </div>
          )}
          {activeRide ? (
            <Button variant="danger" onClick={() => setShowStopRide(true)}>
              <Square className="h-4 w-4" /> Stop Ride ({formatNumber(liveDistanceKm, 2)} {distanceUnit})
            </Button>
          ) : (
            <Button onClick={() => (vehicles.length > 0 ? setShowStartRide(true) : navigate('/vehicles/new'))}>
              <Route className="h-4 w-4" /> Start Ride
            </Button>
          )}
          <Button variant="secondary" onClick={() => openQuickModal('expense')}>
            <Plus className="h-4 w-4" />
            Log Expense
          </Button>
        </div>
      </section>

      {/* Active Ride Live Banner */}
      {activeRide && (
        <Card variant="dark" className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <StatusIndicator tone="active" label="LIVE RIDE" />
            <div>
              <p className="text-sm font-bold text-white">
                Started from {activeRide.startLocation || 'Current Location'}
              </p>
              <p className="text-xs text-[#A6AAA3]">
                {formatNumber(liveDistanceKm, 2)} {distanceUnit} driven ·{' '}
                {String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:
                {String(elapsedSeconds % 60).padStart(2, '0')} elapsed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/trips"
              className="rounded-[10px] bg-[#232724] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#323733]"
            >
              Open Live Map
            </Link>
            <Button size="sm" variant="danger" onClick={() => setShowStopRide(true)}>
              <Square className="h-3.5 w-3.5" /> Stop Ride
            </Button>
          </div>
        </Card>
      )}

      {/* Last Completed Ride Summary Banner */}
      {lastCompletedRide && (
        <Card variant="sage" className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#23331A]">
              Ride Completed · {lastCompletedRide.startLocation || 'Origin'} →{' '}
              {lastCompletedRide.endLocation || 'Destination'}
            </p>
            <p className="mt-1 text-sm font-semibold text-[#171A18]">
              {formatNumber(lastCompletedRide.distance, 2)} {distanceUnit} driven in{' '}
              {lastCompletedRide.duration} min
              {lastCompletedRide.rideSummary?.mileageKmPerUnit
                ? ` · Mileage: ${lastCompletedRide.rideSummary.mileageKmPerUnit} ${distanceUnit}/${fuelUnit}`
                : ''}
              {lastCompletedRide.rideSummary?.estimatedFuelCost
                ? ` · Est. Petrol Cost: ${formatCurrency(lastCompletedRide.rideSummary.estimatedFuelCost, currency)}`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={clearLastCompletedRide}
            className="self-start rounded-[8px] bg-[#171A18] px-3 py-1.5 text-xs font-semibold text-white sm:self-center"
          >
            Dismiss
          </button>
        </Card>
      )}

      {error && (
        <div className="rounded-[12px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318]">
          {error}
        </div>
      )}

      {/* Section B (Financial Overview) + Section C (Vehicle Showcase) Asymmetric Grid */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Section B – Financial Overview */}
        <Card className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7D827A]">
                Monthly Vehicle Expenses
              </span>
              {momDeltaPct !== null ? (
                <span className="inline-flex items-center gap-1 rounded-[8px] bg-[#DCE8D0] px-2.5 py-1 text-xs font-semibold text-[#23331A]">
                  {momDeltaPct >= 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {momDeltaPct >= 0 ? `+${momDeltaPct}%` : `${momDeltaPct}%`} vs last month
                </span>
              ) : (
                <Badge variant="sage">Current Month</Badge>
              )}
            </div>

            <p className="mt-4 text-4xl font-extrabold tracking-tight tabular-nums text-[#171A18] sm:text-5xl">
              {isLoading ? '—' : formatCurrency(s?.monthlyExpenses ?? 0, currency)}
            </p>
            <p className="mt-2 text-sm text-[#5C615A]">
              Today:{' '}
              <strong className="tabular-nums text-[#171A18]">
                {formatCurrency(s?.todayExpenses ?? 0, currency)}
              </strong>{' '}
              · This week:{' '}
              <strong className="tabular-nums text-[#171A18]">
                {formatCurrency(s?.weeklyExpenses ?? 0, currency)}
              </strong>{' '}
              · Annual:{' '}
              <strong className="tabular-nums text-[#171A18]">
                {formatCurrency(s?.annualExpenses ?? 0, currency)}
              </strong>
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[#ECEAE2] pt-6 sm:grid-cols-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#7D827A]">
                Total Expenses
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#171A18]">
                {isLoading ? '—' : formatCurrency(s?.totalExpenses ?? 0, currency)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#7D827A]">
                Total Distance
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#171A18]">
                {isLoading ? '—' : `${formatNumber(s?.totalDistance ?? 0, 1)} ${distanceUnit}`}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#7D827A]">
                Fuel Spending
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#171A18]">
                {isLoading ? '—' : formatCurrency(s?.fuelExpenditure ?? 0, currency)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#7D827A]">
                Maintenance
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#171A18]">
                {isLoading ? '—' : formatCurrency(s?.maintenanceExpenditure ?? 0, currency)}
              </p>
            </div>
          </div>
        </Card>

        {/* Section C – Vehicle Showcase (Graphite) */}
        <Card variant="dark" className="flex flex-col justify-between p-6 sm:p-7 lg:col-span-5">
          {activeVehicle ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center rounded-[6px] bg-[#C5F467] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#171A18]">
                    {activeVehicle.vehicleType}
                  </span>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-white">
                    {activeVehicle.vehicleName}
                  </h2>
                  <p className="text-xs font-medium tracking-wider text-[#A6AAA3]">
                    {activeVehicle.brand} {activeVehicle.model} · {activeVehicle.registrationNumber}
                  </p>
                </div>
                <Link
                  to={`/vehicles/${activeVehicle._id}`}
                  className="text-xs font-semibold text-[#C5F467] hover:underline"
                >
                  Inspect →
                </Link>
              </div>

              <VehicleVisual
                imageUrl={activeVehicle.vehicleImage}
                vehicleType={activeVehicle.vehicleType}
                vehicleName={activeVehicle.vehicleName}
                dark
                className="my-5 h-36 w-full"
              />

              <div className="grid grid-cols-3 gap-3 border-t border-[#2B302C] pt-4 text-xs">
                <div>
                  <p className="text-[#A6AAA3]">Odometer</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-white">
                    {formatNumber(activeVehicle.currentOdometer, 0)} {distanceUnit}
                  </p>
                </div>
                <div>
                  <p className="text-[#A6AAA3]">Mileage</p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-[#C5F467]">
                    {s?.averageMileage
                      ? `${formatNumber(s.averageMileage, 1)} ${distanceUnit}/${fuelUnit}`
                      : activeVehicle.expectedMileage
                        ? `~${activeVehicle.expectedMileage} ${distanceUnit}/${fuelUnit}`
                        : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[#A6AAA3]">Next Service</p>
                  <p className="mt-0.5 text-sm font-bold text-white">
                    {activeVehicleReminder?.nextServiceDate
                      ? formatDate(activeVehicleReminder.nextServiceDate)
                      : activeVehicleReminder?.nextServiceOdometer
                        ? `${formatNumber(activeVehicleReminder.nextServiceOdometer, 0)} ${distanceUnit}`
                        : 'Not set'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <Car className="h-10 w-10 text-[#C5F467]" />
              <h3 className="mt-3 text-base font-bold text-white">Add your first vehicle</h3>
              <p className="mt-1 max-w-xs text-xs text-[#A6AAA3]">
                Register a car, bike, scooter, or EV to unlock vehicle showcase &amp; mileage telemetry.
              </p>
              <Button className="mt-4" onClick={() => navigate('/vehicles/new')}>
                <Plus className="h-4 w-4" /> Add Vehicle
              </Button>
            </div>
          )}
        </Card>
      </section>

      {/* Section G – Quick Actions */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#E4E2D9] bg-white px-5 py-3.5">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7D827A]">
          Quick Actions
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => openQuickModal('trip')}>
            <Route className="h-3.5 w-3.5" /> Add Trip
          </Button>
          <Button size="sm" variant="primary" onClick={() => openQuickModal('expense')}>
            <Receipt className="h-3.5 w-3.5" /> Add Expense
          </Button>
          <Button size="sm" variant="outline" onClick={() => openQuickModal('fuel')}>
            <Fuel className="h-3.5 w-3.5" /> Add Fuel
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/vehicles/new')}>
            <Car className="h-3.5 w-3.5" /> Add Vehicle
          </Button>
          <Button size="sm" variant="outline" onClick={() => openQuickModal('maintenance')}>
            <Wrench className="h-3.5 w-3.5" /> Add Maintenance
          </Button>
        </div>
      </section>

      {/* Section D – Expense Analytics */}
      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-[#171A18]">Monthly Spending &amp; Cost/km</h2>
              <p className="text-xs text-[#7D827A]">
                Cost per {distanceUnit}:{' '}
                <strong className="tabular-nums text-[#171A18]">
                  {formatCurrency(s?.costPerKm ?? 0, currency)}/{distanceUnit}
                </strong>
              </p>
            </div>
            <Link to="/insights" className="text-xs font-semibold text-[#171A18] hover:underline">
              Explore Insights →
            </Link>
          </div>

          <div className="h-64 w-full">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-[#7D827A]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading chart...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E2D9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5C615A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#5C615A' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#171A18',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                    }}
                    formatter={(val: number) => [formatCurrency(val, currency), 'Spent']}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {monthSeries.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={idx === monthSeries.length - 1 ? '#C5F467' : '#171A18'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-6 lg:col-span-4">
          <div>
            <h2 className="text-base font-bold text-[#171A18]">Category Breakdown</h2>
            <p className="mt-0.5 text-xs text-[#7D827A]">Distribution across recorded spend</p>

            {(analytics?.categoryDistribution ?? []).length === 0 ? (
              <p className="py-12 text-center text-xs text-[#7D827A]">
                No expense categories recorded yet.
              </p>
            ) : (
              <div className="mt-5 space-y-3.5">
                {(analytics?.categoryDistribution ?? []).slice(0, 5).map((cat, idx) => (
                  <div key={cat.categoryId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#171A18]">{cat.name}</span>
                      <span className="tabular-nums text-[#5C615A]">
                        {formatCurrency(cat.amount, currency)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#F4F3ED]">
                      <div
                        className={`h-full rounded-full ${
                          idx === 0 ? 'bg-[#C5F467]' : idx === 1 ? 'bg-[#171A18]' : 'bg-[#A6AAA3]'
                        }`}
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-[#ECEAE2] pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7D827A]">
              Spend Trend
            </p>
            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthSeries}>
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#171A18"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#C5F467', stroke: '#171A18' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </section>

      {/* Section E (Recent Activity Timeline) + Section F (Reminders & Budgets) */}
      <section className="grid gap-6 lg:grid-cols-12">
        <Card className="overflow-hidden lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#ECEAE2] px-6 py-4">
            <h2 className="text-base font-bold text-[#171A18]">Recent Activity Timeline</h2>
            <div className="flex gap-4 text-xs font-semibold">
              <Link to="/trips" className="text-[#5C615A] hover:text-[#171A18]">
                Trips
              </Link>
              <Link to="/expenses" className="text-[#171A18] hover:underline">
                Ledger <ArrowRight className="inline h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {timeline.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-[#7D827A]">
              No trips or expenses logged yet. Use Quick Actions above to record your first entry.
            </p>
          ) : (
            <div className="divide-y divide-[#ECEAE2]">
              {timeline.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
                        item.kind === 'trip'
                          ? 'bg-[#DCE8D0] text-[#171A18]'
                          : 'bg-[#F4F3ED] text-[#171A18]'
                      }`}
                    >
                      {item.kind === 'trip' ? (
                        <Route className="h-4 w-4" />
                      ) : (
                        <Receipt className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#171A18]">{item.title}</p>
                      <p className="text-xs text-[#7D827A]">
                        {item.subtitle} · {formatDate(item.dateStr)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-[#171A18]">
                    {item.metric}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6 lg:col-span-5">
          {/* Section F – Maintenance & Document Alerts */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#ECEAE2] px-6 py-4">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-[#171A18]" />
                <h2 className="text-base font-bold text-[#171A18]">Maintenance &amp; Document Alerts</h2>
              </div>
              <Link to="/maintenance" className="text-xs font-semibold text-[#171A18] hover:underline">
                View all
              </Link>
            </div>
            <div className="divide-y divide-[#ECEAE2]">
              {reminders.length === 0 && expiringDocs.length === 0 ? (
                <p className="px-6 py-8 text-center text-xs text-[#7D827A]">
                  All vehicles and documents are up to date.
                </p>
              ) : (
                <>
                  {reminders.slice(0, 3).map((rem) => (
                    <div key={rem._id} className="flex items-center justify-between px-6 py-3.5">
                      <div>
                        <p className="text-sm font-semibold text-[#171A18]">
                          {rem.vehicle.vehicleName} · {rem.serviceType}
                        </p>
                        <p className="text-xs text-[#7D827A]">
                          {rem.reasons.join(' · ') || 'Scheduled service'}
                        </p>
                      </div>
                      <StatusIndicator
                        tone={rem.status === 'overdue' ? 'danger' : rem.status === 'due_soon' ? 'warning' : 'positive'}
                        label={rem.status.replace('_', ' ')}
                      />
                    </div>
                  ))}
                  {expiringDocs.slice(0, 2).map((doc) => (
                    <div key={doc._id} className="flex items-center justify-between px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <FileWarning className="h-4 w-4 text-[#B42318]" />
                        <div>
                          <p className="text-sm font-semibold text-[#171A18]">{doc.title}</p>
                          <p className="text-xs text-[#7D827A]">
                            {doc.documentType} · Expires {formatDate(doc.expiryDate)}
                          </p>
                        </div>
                      </div>
                      <StatusIndicator tone="warning" label="Expiring" />
                    </div>
                  ))}
                </>
              )}
            </div>
          </Card>

          {/* Active Budgets Snapshot */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#171A18]">Budget Utilization</h2>
              <Link to="/budgets" className="text-xs font-semibold text-[#171A18] hover:underline">
                Manage →
              </Link>
            </div>
            {budgets.length === 0 ? (
              <p className="py-4 text-center text-xs text-[#7D827A]">
                No budgets set. Create one in Budgets to track 75%/90%/100% thresholds.
              </p>
            ) : (
              <div className="space-y-3.5">
                {budgets.slice(0, 3).map((b) => (
                  <div key={b._id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#171A18]">
                        {b.vehicle?.vehicleName || b.category?.name || 'Overall'} ({b.period})
                      </span>
                      <span className="tabular-nums text-[#5C615A]">
                        {b.spendingPercentage}% · {formatCurrency(b.amountSpent, currency)} /{' '}
                        {formatCurrency(b.totalBudget, currency)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#F4F3ED]">
                      <div
                        className={`h-full rounded-full ${
                          b.alertLevel === 'exceeded_100'
                            ? 'bg-[#B42318]'
                            : b.alertLevel === 'critical_90' || b.alertLevel === 'warning_75'
                              ? 'bg-[#171A18]'
                              : 'bg-[#C5F467]'
                        }`}
                        style={{ width: `${Math.min(100, b.spendingPercentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Quick Action Modal */}
      <Modal
        open={quickModal !== null}
        onClose={() => setQuickModal(null)}
        title={
          quickModal === 'trip'
            ? 'Quick Add Manual Trip'
            : quickModal === 'fuel'
              ? 'Quick Add Fuel Fill-Up'
              : quickModal === 'maintenance'
                ? 'Quick Add Maintenance'
                : 'Quick Add Expense'
        }
        subtitle="Saves directly to your MongoDB ledger and updates overview analytics."
      >
        <form onSubmit={submitQuickAction} className="space-y-4">
          {modalError && (
            <div className="rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-2.5 text-sm text-[#B42318]">
              {modalError}
            </div>
          )}

          <Select
            label="Vehicle"
            value={qaVehicleId}
            onChange={(e) => setQaVehicleId(e.target.value)}
            options={vehicles.map((v) => ({
              label: `${v.vehicleName} (${v.registrationNumber})`,
              value: v._id,
            }))}
          />

          {quickModal === 'trip' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Start Location"
                value={qaStartLoc}
                onChange={(e) => setQaStartLoc(e.target.value)}
                placeholder="Origin"
              />
              <Input
                label="Destination"
                value={qaEndLoc}
                onChange={(e) => setQaEndLoc(e.target.value)}
                placeholder="Destination"
              />
              <Input
                label={`Start Odometer (${distanceUnit})`}
                type="number"
                step="0.1"
                required
                value={qaStartOdo}
                onChange={(e) => setQaStartOdo(e.target.value)}
              />
              <Input
                label={`End Odometer (${distanceUnit})`}
                type="number"
                step="0.1"
                required
                value={qaEndOdo}
                onChange={(e) => setQaEndOdo(e.target.value)}
              />
            </div>
          )}

          {quickModal === 'expense' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                value={qaCategoryId}
                onChange={(e) => setQaCategoryId(e.target.value)}
                options={categories.map((c) => ({ label: c.name, value: c._id }))}
              />
              <Input
                label={`Amount (${currency})`}
                type="number"
                step="0.01"
                required
                value={qaAmount}
                onChange={(e) => setQaAmount(e.target.value)}
              />
              <Select
                label="Payment Method"
                value={qaPaymentMethod}
                onChange={(e) => setQaPaymentMethod(e.target.value as PaymentMethod)}
                options={[
                  { label: 'Card', value: 'Card' },
                  { label: 'UPI', value: 'UPI' },
                  { label: 'Cash', value: 'Cash' },
                  { label: 'Wallet', value: 'Wallet' },
                ]}
              />
              <Input
                label="Description"
                value={qaDescription}
                onChange={(e) => setQaDescription(e.target.value)}
                placeholder="Optional note"
              />
            </div>
          )}

          {quickModal === 'fuel' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Fuel Type"
                value={qaFuelType}
                onChange={(e) =>
                  setQaFuelType(e.target.value as 'Petrol' | 'Diesel' | 'CNG' | 'EV charging')
                }
                options={[
                  { label: 'Petrol', value: 'Petrol' },
                  { label: 'Diesel', value: 'Diesel' },
                  { label: 'CNG', value: 'CNG' },
                  { label: 'EV charging', value: 'EV charging' },
                ]}
              />
              <Input
                label={`Odometer (${distanceUnit})`}
                type="number"
                step="0.1"
                required
                value={qaOdometer}
                onChange={(e) => setQaOdometer(e.target.value)}
              />
              <Input
                label={`Petrol Amount Paid (${currency})`}
                type="number"
                step="0.01"
                required
                placeholder="e.g. 500"
                value={qaQty}
                onChange={(e) => setQaQty(e.target.value)}
              />
              <Input
                label={`Price per ${fuelUnit} (${currency})`}
                type="number"
                step="0.01"
                required
                value={qaUnitPrice}
                onChange={(e) => setQaUnitPrice(e.target.value)}
              />
              {Number(qaQty) > 0 && Number(qaUnitPrice) > 0 && (
                <div className="sm:col-span-2 rounded-[10px] bg-[#FAF9F5] px-3.5 py-2 text-xs text-[#5C615A]">
                  Calculated Litres:{' '}
                  <strong className="tabular-nums text-[#171A18]">
                    {(Number(qaQty) / Number(qaUnitPrice)).toFixed(2)} {fuelUnit}
                  </strong>
                </div>
              )}
            </div>
          )}

          {quickModal === 'maintenance' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Service Type"
                value={qaServiceType}
                onChange={(e) => setQaServiceType(e.target.value as ServiceType)}
                options={[
                  { label: 'Servicing', value: 'Servicing' },
                  { label: 'Engine oil', value: 'Engine oil' },
                  { label: 'Tyre replacement', value: 'Tyre replacement' },
                  { label: 'Battery replacement', value: 'Battery replacement' },
                  { label: 'Repairs', value: 'Repairs' },
                  { label: 'Insurance', value: 'Insurance' },
                ]}
              />
              <Input
                label={`Amount (${currency})`}
                type="number"
                step="0.01"
                required
                value={qaAmount}
                onChange={(e) => setQaAmount(e.target.value)}
              />
              <Input
                label={`Odometer (${distanceUnit})`}
                type="number"
                step="0.1"
                required
                value={qaOdometer}
                onChange={(e) => setQaOdometer(e.target.value)}
              />
              <Input
                label="Notes"
                value={qaDescription}
                onChange={(e) => setQaDescription(e.target.value)}
                placeholder="Workshop or parts notes"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-[#ECEAE2] pt-4">
            <Button type="button" variant="outline" onClick={() => setQuickModal(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={modalSaving}>
              Save Entry
            </Button>
          </div>
        </form>
      </Modal>

      <StartRideModal
        open={showStartRide}
        onClose={() => setShowStartRide(false)}
        vehicles={vehicles}
        defaultVehicleId={selectedVehicleId}
        onStarted={() => void loadDashboard()}
      />

      <StopRideModal
        open={showStopRide}
        onClose={() => setShowStopRide(false)}
        onCompleted={() => void loadDashboard()}
      />
    </div>
  );
}
