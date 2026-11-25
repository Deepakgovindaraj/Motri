import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Loader2, MapPin, Navigation, Plus, Route, Trash2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { tripService } from '../services/tripService';
import { vehicleService } from '../services/vehicleService';
import { Trip, Vehicle, VehicleRef } from '../types';
import { formatDate, formatNumber, getApiErrorMessage } from '../utils/formatters';

interface ManualTripFormValues {
  vehicleId: string;
  startLocation: string;
  endLocation: string;
  startOdometer: number;
  endOdometer: number;
  purpose: string;
  duration: number;
  startTime: string;
  notes: string;
}

export function TripsPage() {
  const { preferences } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'manual' | 'gps' | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<ManualTripFormValues>({
    defaultValues: {
      purpose: 'Commute',
      duration: 30,
      startTime: new Date().toISOString().slice(0, 16),
    },
  });

  const selectedVehicleId = watch('vehicleId');
  const startOdo = Number(watch('startOdometer') || 0);
  const endOdo = Number(watch('endOdometer') || 0);
  const computedDistance = endOdo >= startOdo ? Number((endOdo - startOdo).toFixed(2)) : 0;

  useEffect(() => {
    const matched = vehicles.find((v) => v._id === selectedVehicleId);
    if (matched) {
      setValue('startOdometer', matched.currentOdometer);
      setValue('endOdometer', matched.currentOdometer);
    }
  }, [selectedVehicleId, vehicles, setValue]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tripsRes, vehiclesRes] = await Promise.all([
        tripService.list({
          vehicleId: vehicleFilter || undefined,
          trackingType: typeFilter,
          limit: 50,
        }),
        vehicleService.list({ limit: 50 }),
      ]);
      setTrips(tripsRes.items);
      setVehicles(vehiclesRes.items);
      if (vehiclesRes.items.length > 0 && !selectedVehicleId) {
        setValue('vehicleId', vehiclesRes.items[0]._id);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load trips'));
    } finally {
      setIsLoading(false);
    }
  }, [vehicleFilter, typeFilter, selectedVehicleId, setValue]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onSubmit = async (values: ManualTripFormValues) => {
    setFormError(null);
    if (Number(values.endOdometer) < Number(values.startOdometer)) {
      setFormError('Ending odometer cannot be less than starting odometer.');
      return;
    }
    try {
      await tripService.createManual({
        vehicleId: values.vehicleId,
        startLocation: values.startLocation,
        endLocation: values.endLocation,
        startOdometer: Number(values.startOdometer),
        endOdometer: Number(values.endOdometer),
        purpose: values.purpose,
        duration: Number(values.duration || 0),
        startTime: values.startTime ? new Date(values.startTime).toISOString() : undefined,
        notes: values.notes,
      });
      reset({
        vehicleId: values.vehicleId,
        purpose: 'Commute',
        duration: 30,
        startTime: new Date().toISOString().slice(0, 16),
      });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to save trip'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this trip record?')) return;
    try {
      await tripService.remove(id);
      setTrips((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete trip'));
    }
  };

  const distanceUnit = preferences?.distanceUnit ?? 'km';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Trips</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Log manual odometer trips or view GPS-tracked journeys.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/gps-tracking"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-navy-900 dark:text-slate-200 dark:hover:bg-navy-800"
          >
            <Navigation className="h-4 w-4 text-electric-600" />
            Live GPS Track
          </Link>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            {showForm ? 'Close Form' : 'Log Manual Trip'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Record Manual Trip
          </h2>
          {vehicles.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Please{' '}
              <Link to="/vehicles/new" className="font-semibold text-electric-600 hover:underline">
                add a vehicle
              </Link>{' '}
              first before logging trips.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                  {formError}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                <Select
                  label="Vehicle"
                  options={vehicles.map((v) => ({
                    label: `${v.vehicleName} (${v.registrationNumber})`,
                    value: v._id,
                  }))}
                  {...register('vehicleId', { required: true })}
                />
                <Input label="Start Location" placeholder="e.g. Home" {...register('startLocation')} />
                <Input label="Destination" placeholder="e.g. Office" {...register('endLocation')} />
                <Input
                  label={`Starting Odometer (${distanceUnit})`}
                  type="number"
                  step="0.1"
                  {...register('startOdometer', { required: true })}
                />
                <Input
                  label={`Ending Odometer (${distanceUnit})`}
                  type="number"
                  step="0.1"
                  {...register('endOdometer', { required: true })}
                />
                <div className="flex flex-col justify-end">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-navy-800">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Calculated Distance: </span>
                    <span className="font-semibold text-electric-600 dark:text-blue-400">
                      {computedDistance} {distanceUnit}
                    </span>
                  </div>
                </div>
                <Select
                  label="Purpose"
                  options={[
                    { label: 'Commute', value: 'Commute' },
                    { label: 'Business', value: 'Business' },
                    { label: 'Personal', value: 'Personal' },
                    { label: 'Delivery', value: 'Delivery' },
                    { label: 'Road Trip', value: 'Road Trip' },
                    { label: 'Errand', value: 'Errand' },
                  ]}
                  {...register('purpose')}
                />
                <Input label="Duration (minutes)" type="number" {...register('duration')} />
                <Input label="Trip Date & Time" type="datetime-local" {...register('startTime')} />
              </div>
              <Input label="Notes" placeholder="Optional trip notes" {...register('notes')} />
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  Save Trip
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            options={[
              { label: 'All Vehicles', value: '' },
              ...vehicles.map((v) => ({ label: v.vehicleName, value: v._id })),
            ]}
          />
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'manual' | 'gps' | '')}
            options={[
              { label: 'All Tracking Types', value: '' },
              { label: 'Manual Trips', value: 'manual' },
              { label: 'GPS Tracked', value: 'gps' },
            ]}
          />
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-sm text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-electric-600" />
            Loading trips...
          </div>
        ) : trips.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Route className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
              No trips recorded yet
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Log a manual odometer trip or start a live GPS ride.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {trips.map((trip) => {
              const vehicle = trip.vehicleId as VehicleRef;
              return (
                <div
                  key={trip._id}
                  className="flex flex-col justify-between gap-4 px-6 py-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                        <MapPin className="h-4 w-4 text-electric-600" />
                        {trip.startLocation || 'Origin'} → {trip.endLocation || 'Destination'}
                      </span>
                      <Badge variant={trip.trackingType === 'gps' ? 'green' : 'blue'}>
                        {trip.trackingType.toUpperCase()}
                      </Badge>
                      {trip.purpose && <Badge variant="neutral">{trip.purpose}</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {vehicle?.vehicleName ?? 'Vehicle'} · {formatDate(trip.startTime)} ·{' '}
                      {trip.duration} min
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatNumber(trip.distance, 2)} {distanceUnit}
                      </p>
                      {trip.startOdometer !== undefined && trip.endOdometer !== undefined && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatNumber(trip.startOdometer, 0)} → {formatNumber(trip.endOdometer, 0)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(trip._id)}
                      className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
