import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { analyticsService } from '../services/analyticsService';
import { vehicleService } from '../services/vehicleService';
import {
  CostPerKmResponse,
  DashboardAnalytics,
  MileageAnalyticsResponse,
  PeriodReportsResponse,
  Vehicle,
  VehicleComparisonItem,
} from '../types';
import { formatCurrency, formatNumber, getApiErrorMessage } from '../utils/formatters';

type ReportGranularity = 'daily' | 'weekly' | 'monthly' | 'annual';

export function AnalyticsPage() {
  const { preferences } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [granularity, setGranularity] = useState<ReportGranularity>('monthly');

  const [dashboard, setDashboard] = useState<DashboardAnalytics | null>(null);
  const [reports, setReports] = useState<PeriodReportsResponse | null>(null);
  const [mileage, setMileage] = useState<MileageAnalyticsResponse | null>(null);
  const [costPerKm, setCostPerKm] = useState<CostPerKmResponse | null>(null);
  const [comparison, setComparison] = useState<VehicleComparisonItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vehRes, dashRes, repRes, milRes, cpkRes, compRes] = await Promise.all([
        vehicleService.list({ limit: 50 }),
        analyticsService.getDashboard(),
        analyticsService.getMonthly({
          year: selectedYear,
          vehicleId: selectedVehicleId || undefined,
        }),
        analyticsService.getMileage(selectedVehicleId || undefined),
        analyticsService.getCostPerKm(selectedVehicleId || undefined),
        analyticsService.getComparison(),
      ]);
      setVehicles(vehRes.items);
      setDashboard(dashRes);
      setReports(repRes);
      setMileage(milRes);
      setCostPerKm(cpkRes);
      setComparison(compRes);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load analytics'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedVehicleId, selectedYear]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const currency = preferences?.currency ?? 'USD';
  const distanceUnit = preferences?.distanceUnit ?? 'km';
  const fuelUnit = preferences?.fuelUnit ?? 'L';

  const periodChartData = (() => {
    if (!reports) return [];
    if (granularity === 'daily') {
      return reports.dailyReport.map((d) => ({ label: d.date, amount: d.amount }));
    }
    if (granularity === 'weekly') {
      return reports.weeklyReport.map((w) => ({ label: w.label, amount: w.amount }));
    }
    if (granularity === 'annual') {
      return reports.annualReport.map((a) => ({ label: String(a.year), amount: a.amount }));
    }
    return reports.monthlyReport.map((m) => ({ label: m.label, amount: m.amount }));
  })();

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Financial Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Daily, weekly, monthly, and annual expenditure, mileage, cost per {distanceUnit}, and
            vehicle comparisons.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            options={[
              { label: 'All Vehicles', value: '' },
              ...vehicles.map((v) => ({ label: v.vehicleName, value: v._id })),
            ]}
          />
          <Select
            value={String(selectedYear)}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            options={[0, 1, 2].map((offset) => ({
              label: String(currentYear - offset),
              value: String(currentYear - offset),
            }))}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <Card className="flex items-center justify-center py-20 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-electric-600" />
          Computing MongoDB analytics...
        </Card>
      ) : (
        <>
          {/* Expense Report by Granularity */}
          <Card className="p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Expense Reports ({granularity.charAt(0).toUpperCase() + granularity.slice(1)})
              </h2>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-navy-950">
                {(['daily', 'weekly', 'monthly', 'annual'] as ReportGranularity[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setGranularity(tab)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                      granularity === tab
                        ? 'bg-electric-600 text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72 w-full">
              {periodChartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No expense data for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={periodChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(val: number) => formatCurrency(val, currency)} />
                    <Bar dataKey="amount" fill="#2563EB" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Mileage & Cost-Per-KM Trends */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Mileage Trend ({distanceUnit}/{fuelUnit})
                </h2>
                <span className="text-xs font-semibold text-electric-600 dark:text-blue-400">
                  Avg:{' '}
                  {mileage && mileage.averageMileage > 0
                    ? `${formatNumber(mileage.averageMileage, 2)} ${distanceUnit}/${fuelUnit}`
                    : 'N/A'}
                </span>
              </div>
              <div className="h-64 w-full">
                {(mileage?.series ?? []).length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    Record at least two full-tank fill-ups to plot mileage.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mileage?.series ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="mileage"
                        stroke="#16A34A"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Cost per {distanceUnit} Trend
                </h2>
                <span className="text-xs font-semibold text-electric-600 dark:text-blue-400">
                  Overall: {formatCurrency(costPerKm?.overallCostPerKm ?? 0, currency)}/{distanceUnit}
                </span>
              </div>
              <div className="h-64 w-full">
                {(costPerKm?.timeline ?? []).length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    Log trips and expenses to compute cost per {distanceUnit}.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={costPerKm?.timeline ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(val: number) => formatCurrency(val, currency)} />
                      <Line
                        type="monotone"
                        dataKey="costPerKm"
                        stroke="#2563EB"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          {/* Vehicle Comparison & Category Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
                Vehicle Spend Comparison
              </h2>
              <div className="h-64 w-full">
                {comparison.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No vehicles to compare.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="vehicleName" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(val: number) => formatCurrency(val, currency)} />
                      <Legend />
                      <Bar dataKey="fuelSpend" name="Fuel" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      <Bar
                        dataKey="maintenanceSpend"
                        name="Maintenance"
                        fill="#0B192C"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
                Category-wise Expenditure
              </h2>
              {(dashboard?.categoryDistribution ?? []).length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                  No expenses recorded yet.
                </div>
              ) : (
                <div className="grid items-center gap-4 sm:grid-cols-2">
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dashboard?.categoryDistribution ?? []}
                          dataKey="amount"
                          nameKey="name"
                          outerRadius={80}
                        >
                          {(dashboard?.categoryDistribution ?? []).map((cat) => (
                            <Cell key={cat.categoryId} fill={cat.color || '#2563EB'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: number) => formatCurrency(val, currency)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 text-xs">
                    {(dashboard?.categoryDistribution ?? []).slice(0, 6).map((cat) => (
                      <div key={cat.categoryId} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: cat.color || '#2563EB' }}
                          />
                          {cat.name}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(cat.amount, currency)} ({cat.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Comparison Table */}
          {comparison.length > 0 && (
            <Card className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-navy-950 dark:text-slate-400">
                  <tr>
                    <th className="px-6 py-3">Vehicle</th>
                    <th className="px-6 py-3">Distance</th>
                    <th className="px-6 py-3">Fuel Spend</th>
                    <th className="px-6 py-3">Maintenance</th>
                    <th className="px-6 py-3">Total Spend</th>
                    <th className="px-6 py-3">Avg Mileage</th>
                    <th className="px-6 py-3">Cost / {distanceUnit}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {comparison.map((row) => (
                    <tr key={row.vehicleId}>
                      <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-white">
                        {row.vehicleName}
                      </td>
                      <td className="px-6 py-3.5">
                        {formatNumber(row.totalDistance, 1)} {distanceUnit}
                      </td>
                      <td className="px-6 py-3.5">{formatCurrency(row.fuelSpend, currency)}</td>
                      <td className="px-6 py-3.5">
                        {formatCurrency(row.maintenanceSpend, currency)}
                      </td>
                      <td className="px-6 py-3.5 font-semibold">
                        {formatCurrency(row.totalSpend, currency)}
                      </td>
                      <td className="px-6 py-3.5">
                        {row.averageMileage > 0
                          ? `${formatNumber(row.averageMileage, 2)} ${distanceUnit}/${fuelUnit}`
                          : '—'}
                      </td>
                      <td className="px-6 py-3.5">{formatCurrency(row.costPerKm, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
