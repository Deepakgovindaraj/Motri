import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Loader2, PlusCircle, Search, Trash2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { vehicleService } from '../services/vehicleService';
import { FuelType, Vehicle, VehicleType } from '../types';
import { formatNumber, getApiErrorMessage } from '../utils/formatters';

export function VehiclesPage() {
  const { preferences } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<VehicleType | ''>('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<FuelType | ''>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadVehicles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await vehicleService.list({
        q: searchQuery || undefined,
        vehicleType: vehicleTypeFilter,
        fuelType: fuelTypeFilter,
        limit: 50,
      });
      setVehicles(res.items);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load vehicles'));
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, vehicleTypeFilter, fuelTypeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadVehicles();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadVehicles]);

  const handleDelete = async (vehicle: Vehicle) => {
    const confirmed = window.confirm(
      `Remove "${vehicle.vehicleName}" (${vehicle.registrationNumber})? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(vehicle._id);
    try {
      await vehicleService.remove(vehicle._id);
      setVehicles((prev) => prev.filter((item) => item._id !== vehicle._id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete vehicle'));
    } finally {
      setDeletingId(null);
    }
  };

  const distanceUnit = preferences?.distanceUnit ?? 'km';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Vehicles
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage all registered motorcycles, scooters, cars, and electric vehicles.
          </p>
        </div>
        <Link
          to="/vehicles/new"
          className="inline-flex items-center gap-2 rounded-lg bg-electric-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-electric-700"
        >
          <PlusCircle className="h-4 w-4" />
          Add Vehicle
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, reg no, brand..."
              className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-electric-600 focus:outline-none focus:ring-2 focus:ring-electric-600/20 dark:border-slate-700 dark:bg-navy-950 dark:text-slate-100"
            />
          </div>

          <Select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value as VehicleType | '')}
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
            value={fuelTypeFilter}
            onChange={(e) => setFuelTypeFilter(e.target.value as FuelType | '')}
            options={[
              { label: 'All Fuel Types', value: '' },
              { label: 'Petrol', value: 'Petrol' },
              { label: 'Diesel', value: 'Diesel' },
              { label: 'CNG', value: 'CNG' },
              { label: 'EV charging', value: 'EV charging' },
              { label: 'Hybrid', value: 'Hybrid' },
              { label: 'Other', value: 'Other' },
            ]}
          />
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <Card className="flex items-center justify-center py-16 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-electric-600" />
          Loading your garage...
        </Card>
      ) : vehicles.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <Car className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            No matching vehicles found
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Register a vehicle or clear your search filters to view your fleet.
          </p>
          <div className="mt-5">
            <Link
              to="/vehicles/new"
              className="inline-flex items-center gap-2 rounded-lg bg-electric-600 px-4 py-2 text-sm font-semibold text-white hover:bg-electric-700"
            >
              <PlusCircle className="h-4 w-4" />
              Add Vehicle
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <Card key={vehicle._id} className="flex flex-col justify-between p-6">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/vehicles/${vehicle._id}`}
                      className="text-base font-semibold text-slate-900 hover:text-electric-600 dark:text-white dark:hover:text-electric-500"
                    >
                      {vehicle.vehicleName}
                    </Link>
                    <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {vehicle.registrationNumber}
                    </p>
                  </div>
                  <Badge variant="blue">{vehicle.vehicleType}</Badge>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Make &amp; Model</dt>
                    <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                      {vehicle.brand} {vehicle.model}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Year</dt>
                    <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                      {vehicle.manufacturingYear}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Fuel</dt>
                    <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                      {vehicle.fuelType}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Odometer</dt>
                    <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                      {formatNumber(vehicle.currentOdometer, 0)} {distanceUnit}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <Link
                  to={`/vehicles/${vehicle._id}`}
                  className="text-sm font-semibold text-electric-600 hover:underline"
                >
                  View &amp; Edit
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={deletingId === vehicle._id}
                  onClick={() => handleDelete(vehicle)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
