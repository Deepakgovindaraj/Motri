import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, Loader2, Pencil, Plus, Search, ShieldCheck, Trash2, Wrench } from 'lucide-react';
import { VehicleVisual } from '../components/VehicleVisual';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { useAuth } from '../context/AuthContext';
import { analyticsService } from '../services/analyticsService';
import { documentService } from '../services/documentService';
import { maintenanceService } from '../services/maintenanceService';
import { vehicleService } from '../services/vehicleService';
import {
  MaintenanceRecord,
  Vehicle,
  VehicleComparisonItem,
  VehicleDocumentItem,
  VehicleRef,
  VehicleType,
} from '../types';
import { formatCurrency, formatDate, formatNumber, getApiErrorMessage } from '../utils/formatters';

export function VehiclesPage() {
  const { preferences } = useAuth();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [comparisons, setComparisons] = useState<VehicleComparisonItem[]>([]);
  const [documents, setDocuments] = useState<VehicleDocumentItem[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<VehicleType | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [vehRes, compRes, docRes, maintRes] = await Promise.all([
        vehicleService.list({
          q: searchQuery || undefined,
          vehicleType: typeFilter,
          limit: 50,
        }),
        analyticsService.getComparison(),
        documentService.list(),
        maintenanceService.list({ limit: 50 }),
      ]);
      setVehicles(vehRes.items);
      setComparisons(compRes);
      setDocuments(docRes);
      setMaintenance(maintRes.items);
      if (vehRes.items.length > 0) {
        setSelectedId((prev) =>
          vehRes.items.some((v) => v._id === prev) ? prev : vehRes.items[0]._id,
        );
      } else {
        setSelectedId('');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load garage'));
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, typeFilter]);

  useEffect(() => {
    const t = setTimeout(() => void loadData(), 200);
    return () => clearTimeout(t);
  }, [loadData]);

  const activeVehicle = useMemo(
    () => vehicles.find((v) => v._id === selectedId) ?? vehicles[0] ?? null,
    [vehicles, selectedId],
  );

  const activeMetrics = useMemo(
    () => comparisons.find((c) => c.vehicleId === activeVehicle?._id) ?? null,
    [comparisons, activeVehicle],
  );

  const activeInsurance = useMemo(
    () =>
      documents.find(
        (d) =>
          (d.vehicleId as VehicleRef)?._id === activeVehicle?._id &&
          d.documentType === 'Insurance',
      ) ?? null,
    [documents, activeVehicle],
  );

  const activeMaintenance = useMemo(
    () =>
      maintenance.filter(
        (m) => (m.vehicleId as VehicleRef)?._id === activeVehicle?._id,
      ),
    [maintenance, activeVehicle],
  );

  const handleDelete = async (vehicle: Vehicle) => {
    if (!window.confirm(`Remove "${vehicle.vehicleName}" (${vehicle.registrationNumber})?`)) return;
    setDeletingId(vehicle._id);
    try {
      await vehicleService.remove(vehicle._id);
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete vehicle'));
    } finally {
      setDeletingId(null);
    }
  };

  const currency = preferences?.currency ?? 'USD';
  const distanceUnit = preferences?.distanceUnit ?? 'km';
  const fuelUnit = preferences?.fuelUnit ?? 'L';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#171A18]">Garage Showcase</h1>
          <p className="mt-1 text-sm text-[#5C615A]">
            Inspect specifications, odometer milestones, insurance status, and vehicle-level costs.
          </p>
        </div>
        <Button onClick={() => navigate('/vehicles/new')}>
          <Plus className="h-4 w-4" /> Register Vehicle
        </Button>
      </div>

      {/* Filter & Vehicle Selector Bar */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#A6AAA3]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vehicle, reg no, brand..."
              className="block w-full rounded-[10px] border border-[#DCDAD0] bg-white py-2.5 pl-9 pr-3.5 text-sm text-[#171A18] placeholder-[#A6AAA3] focus:border-[#171A18] focus:outline-none"
            />
          </div>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as VehicleType | '')}
            options={[
              { label: 'All Categories', value: '' },
              { label: 'Car', value: 'Car' },
              { label: 'Bike', value: 'Bike' },
              { label: 'Scooter', value: 'Scooter' },
              { label: 'Electric vehicle', value: 'Electric vehicle' },
              { label: 'Other', value: 'Other' },
            ]}
          />
          <Select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            options={
              vehicles.length > 0
                ? vehicles.map((v) => ({
                    label: `${v.vehicleName} (${v.registrationNumber})`,
                    value: v._id,
                  }))
                : [{ label: 'No vehicles available', value: '' }]
            }
          />
        </div>
      </Card>

      {error && (
        <div className="rounded-[12px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318]">
          {error}
        </div>
      )}

      {isLoading ? (
        <Card className="flex items-center justify-center py-20 text-sm text-[#7D827A]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading garage...
        </Card>
      ) : !activeVehicle ? (
        <Card className="px-6 py-16 text-center">
          <Car className="mx-auto h-10 w-10 text-[#A6AAA3]" />
          <h3 className="mt-3 text-base font-bold text-[#171A18]">No vehicles in your garage</h3>
          <p className="mt-1 text-sm text-[#5C615A]">
            Register your first car, motorcycle, scooter, or EV to start tracking.
          </p>
          <Button className="mt-5" onClick={() => navigate('/vehicles/new')}>
            <Plus className="h-4 w-4" /> Register Vehicle
          </Button>
        </Card>
      ) : (
        <>
          {/* Vehicle Selector Pills */}
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {vehicles.map((v) => {
              const isSelected = v._id === activeVehicle._id;
              return (
                <button
                  key={v._id}
                  type="button"
                  onClick={() => setSelectedId(v._id)}
                  className={`shrink-0 rounded-[10px] border px-4 py-2 text-left transition-colors ${
                    isSelected
                      ? 'border-[#171A18] bg-[#171A18] text-white'
                      : 'border-[#E4E2D9] bg-white text-[#171A18] hover:bg-[#FAF9F5]'
                  }`}
                >
                  <p className="text-xs font-bold">{v.vehicleName}</p>
                  <p className={`text-[11px] ${isSelected ? 'text-[#C5F467]' : 'text-[#7D827A]'}`}>
                    {v.registrationNumber}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Primary Showcase Panel */}
          <div className="grid gap-6 lg:grid-cols-12">
            <Card variant="dark" className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge variant="lime">{activeVehicle.vehicleType}</Badge>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    {activeVehicle.vehicleName}
                  </h2>
                  <p className="mt-1 text-sm text-[#A6AAA3]">
                    {activeVehicle.brand} {activeVehicle.model} ({activeVehicle.manufacturingYear}) ·{' '}
                    {activeVehicle.registrationNumber}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/vehicles/${activeVehicle._id}`}
                    className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#232724] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#323733]"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                  <Button
                    size="sm"
                    variant="danger"
                    isLoading={deletingId === activeVehicle._id}
                    onClick={() => handleDelete(activeVehicle)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <VehicleVisual
                imageUrl={activeVehicle.vehicleImage}
                vehicleType={activeVehicle.vehicleType}
                vehicleName={activeVehicle.vehicleName}
                dark
                className="my-6 h-56 w-full sm:h-64"
              />

              <dl className="grid grid-cols-2 gap-4 border-t border-[#2B302C] pt-5 sm:grid-cols-4">
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#A6AAA3]">Odometer</dt>
                  <dd className="mt-1 text-base font-bold tabular-nums text-white">
                    {formatNumber(activeVehicle.currentOdometer, 0)} {distanceUnit}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#A6AAA3]">Fuel</dt>
                  <dd className="mt-1 text-base font-bold text-white">{activeVehicle.fuelType}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#A6AAA3]">Capacity</dt>
                  <dd className="mt-1 text-base font-bold tabular-nums text-white">
                    {activeVehicle.tankCapacity ? `${activeVehicle.tankCapacity} units` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-[#A6AAA3]">Purchased</dt>
                  <dd className="mt-1 text-base font-bold text-white">
                    {formatDate(activeVehicle.purchaseDate)}
                  </dd>
                </div>
              </dl>
            </Card>

            {/* Right Column: Expense Analysis + Insurance + Maintenance History */}
            <div className="space-y-6 lg:col-span-5">
              <Card className="p-6">
                <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-[#7D827A]">
                  Vehicle Financial Analysis
                </h3>
                <p className="mt-3 text-3xl font-extrabold tabular-nums text-[#171A18]">
                  {formatCurrency(activeMetrics?.totalSpend ?? 0, currency)}
                </p>
                <p className="mt-0.5 text-xs text-[#7D827A]">
                  Cumulative spend across {activeMetrics?.expenseCount ?? 0} transactions
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#ECEAE2] pt-4 text-xs">
                  <div>
                    <p className="text-[#7D827A]">Fuel Spend</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-[#171A18]">
                      {formatCurrency(activeMetrics?.fuelSpend ?? 0, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#7D827A]">Maintenance</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-[#171A18]">
                      {formatCurrency(activeMetrics?.maintenanceSpend ?? 0, currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#7D827A]">Measured Mileage</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-[#171A18]">
                      {activeMetrics?.averageMileage
                        ? `${activeMetrics.averageMileage} ${distanceUnit}/${fuelUnit}`
                        : activeVehicle.expectedMileage
                          ? `Est. ${activeVehicle.expectedMileage} ${distanceUnit}/${fuelUnit}`
                          : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#7D827A]">Cost per {distanceUnit}</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-[#171A18]">
                      {formatCurrency(activeMetrics?.costPerKm ?? 0, currency)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#171A18]" />
                    <h3 className="text-sm font-bold text-[#171A18]">Insurance Status</h3>
                  </div>
                  <Link to="/documents" className="text-xs font-semibold text-[#171A18] hover:underline">
                    Documents →
                  </Link>
                </div>
                {activeInsurance ? (
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#171A18]">{activeInsurance.title}</p>
                      <p className="text-xs text-[#7D827A]">
                        Expires {formatDate(activeInsurance.expiryDate)}
                      </p>
                    </div>
                    <StatusIndicator
                      tone={
                        activeInsurance.expiryDate &&
                        new Date(activeInsurance.expiryDate).getTime() < Date.now()
                          ? 'danger'
                          : 'positive'
                      }
                      label={
                        activeInsurance.expiryDate &&
                        new Date(activeInsurance.expiryDate).getTime() < Date.now()
                          ? 'Expired'
                          : 'Active'
                      }
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[#7D827A]">
                    No insurance document linked. Add one in Documents to track expiry.
                  </p>
                )}
              </Card>

              <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#ECEAE2] px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-[#171A18]" />
                    <h3 className="text-sm font-bold text-[#171A18]">Maintenance History</h3>
                  </div>
                  <Link to="/maintenance" className="text-xs font-semibold text-[#171A18] hover:underline">
                    All →
                  </Link>
                </div>
                {activeMaintenance.length === 0 ? (
                  <p className="px-6 py-6 text-center text-xs text-[#7D827A]">
                    No service records for this vehicle yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[#ECEAE2]">
                    {activeMaintenance.slice(0, 4).map((m) => (
                      <div key={m._id} className="flex items-center justify-between px-6 py-3 text-xs">
                        <div>
                          <p className="font-semibold text-[#171A18]">{m.serviceType}</p>
                          <p className="text-[#7D827A]">
                            {formatDate(m.serviceDate)} · {formatNumber(m.odometer, 0)} {distanceUnit}
                          </p>
                        </div>
                        <span className="font-bold tabular-nums text-[#171A18]">
                          {formatCurrency(m.expenseId?.amount ?? 0, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
