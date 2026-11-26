import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Loader2, PiggyBank } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, TableColumn } from '../components/ui/DataTable';
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
      setError(getApiErrorMessage(err, 'Failed to load insights'));
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
    if (granularity === 'daily') return reports.dailyReport.map((d) => ({ label: d.date, amount: d.amount }));
    if (granularity === 'weekly') return reports.weeklyReport.map((w) => ({ label: w.label, amount: w.amount }));
    if (granularity === 'annual') return reports.annualReport.map((a) => ({ label: String(a.year), amount: a.amount }));
    return reports.monthlyReport.map((m) => ({ label: m.label, amount: m.amount }));
  })();

  const handleExportCsv = () => {
    const rows = [
      ['Vehicle', 'Type', 'Registration', `Distance (${distanceUnit})`, `Fuel Spend (${currency})`, `Maintenance (${currency})`, `Total Spend (${currency})`, `Avg Mileage (${distanceUnit}/${fuelUnit})`, `Cost per ${distanceUnit}`],
      ...comparison.map((c) => [
        c.vehicleName,
        c.vehicleType,
        c.registrationNumber,
        String(c.totalDistance),
        String(c.fuelSpend),
        String(c.maintenanceSpend),
        String(c.totalSpend),
        String(c.averageMileage),
        String(c.costPerKm),
      ]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vehixa-insights-${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const currentYear = new Date().getFullYear();

  const comparisonColumns: TableColumn<VehicleComparisonItem>[] = [
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (r) => (
        <div>
          <p className="font-bold text-[#171A18]">{r.vehicleName}</p>
          <p className="text-xs text-[#7D827A]">{r.registrationNumber}</p>
        </div>
      ),
    },
    {
      key: 'distance',
      header: 'Distance',
      align: 'right',
      render: (r) => `${formatNumber(r.totalDistance, 1)} ${distanceUnit}`,
    },
    {
      key: 'fuel',
      header: 'Fuel',
      align: 'right',
      render: (r) => formatCurrency(r.fuelSpend, currency),
    },
    {
      key: 'maint',
      header: 'Maintenance',
      align: 'right',
      render: (r) => formatCurrency(r.maintenanceSpend, currency),
    },
    {
      key: 'total',
      header: 'Total Spend',
      align: 'right',
      render: (r) => <span className="font-bold">{formatCurrency(r.totalSpend, currency)}</span>,
    },
    {
      key: 'mileage',
      header: 'Efficiency',
      align: 'right',
      render: (r) =>
        r.averageMileage > 0 ? `${formatNumber(r.averageMileage, 2)} ${distanceUnit}/${fuelUnit}` : '—',
    },
    {
      key: 'cpk',
      header: `Cost/${distanceUnit}`,
      align: 'right',
      render: (r) => formatCurrency(r.costPerKm, currency),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#171A18]">
            Financial Insights
          </h1>
          <p className="mt-1 text-sm text-[#5C615A]">
            Spending trends, cost per {distanceUnit}, fuel efficiency, vehicle comparisons, and exportable reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
          <Link
            to="/budgets"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#DCDAD0] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#171A18] hover:bg-[#FAF9F5]"
          >
            <PiggyBank className="h-4 w-4" /> Budgets
          </Link>
          <Button variant="secondary" onClick={handleExportCsv} disabled={comparison.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-[12px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318]">
          {error}
        </div>
      )}

      {isLoading ? (
        <Card className="flex items-center justify-center py-20 text-sm text-[#7D827A]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Running MongoDB aggregations...
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-bold text-[#171A18]">
                Expenditure Trends ({granularity.charAt(0).toUpperCase() + granularity.slice(1)})
              </h2>
              <div className="inline-flex rounded-[10px] border border-[#E4E2D9] bg-[#F4F3ED] p-1">
                {(['daily', 'weekly', 'monthly', 'annual'] as ReportGranularity[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setGranularity(tab)}
                    className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                      granularity === tab
                        ? 'bg-[#171A18] text-[#C5F467]'
                        : 'text-[#5C615A] hover:text-[#171A18]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72 w-full">
              {periodChartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-[#7D827A]">
                  No expense data for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={periodChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E2D9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5C615A' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#5C615A' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#171A18', border: 'none', borderRadius: '10px', color: '#fff' }}
                      formatter={(val: number) => formatCurrency(val, currency)}
                    />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                      {periodChartData.map((_, i) => (
                        <Cell key={i} fill={i === periodChartData.length - 1 ? '#C5F467' : '#171A18'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#171A18]">
                  Fuel Efficiency ({distanceUnit}/{fuelUnit})
                </h2>
                <span className="rounded-[8px] bg-[#DCE8D0] px-2.5 py-1 text-xs font-bold text-[#23331A]">
                  Avg:{' '}
                  {mileage && mileage.averageMileage > 0
                    ? `${formatNumber(mileage.averageMileage, 2)} ${distanceUnit}/${fuelUnit}`
                    : 'N/A'}
                </span>
              </div>
              <div className="h-64 w-full">
                {(mileage?.series ?? []).length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-[#7D827A]">
                    Record at least two full-tank fill-ups to plot fuel efficiency.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mileage?.series ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4E2D9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#5C615A' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#5C615A' }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="mileage"
                        stroke="#171A18"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#C5F467', stroke: '#171A18' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#171A18]">
                  Cost per {distanceUnit} Trend
                </h2>
                <span className="rounded-[8px] bg-[#171A18] px-2.5 py-1 text-xs font-bold text-[#C5F467]">
                  {formatCurrency(costPerKm?.overallCostPerKm ?? 0, currency)}/{distanceUnit}
                </span>
              </div>
              <div className="h-64 w-full">
                {(costPerKm?.timeline ?? []).length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-[#7D827A]">
                    Log trips and expenses to compute cost per {distanceUnit}.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={costPerKm?.timeline ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4E2D9" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#5C615A' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#5C615A' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(val: number) => formatCurrency(val, currency)} />
                      <Line
                        type="monotone"
                        dataKey="costPerKm"
                        stroke="#171A18"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#DCE8D0', stroke: '#171A18' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="mb-4 text-base font-bold text-[#171A18]">Vehicle-Wise Comparison</h2>
              <div className="h-64 w-full">
                {comparison.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-[#7D827A]">
                    No vehicles to compare.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparison}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4E2D9" vertical={false} />
                      <XAxis dataKey="vehicleName" tick={{ fontSize: 12, fill: '#5C615A' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#5C615A' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(val: number) => formatCurrency(val, currency)} />
                      <Legend />
                      <Bar dataKey="fuelSpend" name="Fuel" fill="#171A18" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="maintenanceSpend" name="Maintenance" fill="#C5F467" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-base font-bold text-[#171A18]">Expense Category Analysis</h2>
              {(dashboard?.categoryDistribution ?? []).length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-[#7D827A]">
                  No expenses recorded yet.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {(dashboard?.categoryDistribution ?? []).slice(0, 7).map((cat, idx) => (
                    <div key={cat.categoryId} className="space-y-1">
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
            </Card>
          </div>

          {comparison.length > 0 && (
            <Card className="overflow-hidden">
              <DataTable
                columns={comparisonColumns}
                rows={comparison}
                keyExtractor={(r) => r.vehicleId}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
