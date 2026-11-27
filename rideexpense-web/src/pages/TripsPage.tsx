import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Loader2, MapPin, Navigation, Play, Plus, Route, Square, Trash2 } from 'lucide-react';
import { StartRideModal } from '../components/StartRideModal';
import { StopRideModal } from '../components/StopRideModal';
import { TripMap } from '../components/TripMap';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { useAuth } from '../context/AuthContext';
import { useRide } from '../context/RideContext';
import { tripService } from '../services/tripService';
import { vehicleService } from '../services/vehicleService';
import { Trip, TripLocationPoint, Vehicle, VehicleRef } from '../types';
import { formatCurrency, formatDate, formatNumber, getApiErrorMessage } from '../utils/formatters';

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
  const {
    activeRide,
    livePoints,
    routePoints,
    liveDistanceKm,
    liveAccuracy,
    elapsedSeconds,
    wakeLockActive,
    pendingSyncCount,
    gpsNotice,
    lastCompletedRide,
    clearLastCompletedRide,
  } = useRide();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [inspectedPoints, setInspectedPoints] = useState<TripLocationPoint[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const [vehicleFilter, setVehicleFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'manual' | 'gps' | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showStartRide, setShowStartRide] = useState(false);
  const [showStopRide, setShowStopRide] = useState(false);
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
      purpose: 'Travel',
      duration: 30,
      startTime: new Date().toISOString().slice(0, 16),
    },
  });

  const manualVehicleId = watch('vehicleId');
  const startOdo = Number(watch('startOdometer') || 0);
  const endOdo = Number(watch('endOdometer') || 0);
  const computedDistance = endOdo >= startOdo ? Number((endOdo - startOdo).toFixed(2)) : 0;

  useEffect(() => {
    const matched = vehicles.find((v) => v._id === manualVehicleId);
    if (matched) {
      setValue('startOdometer', matched.currentOdometer);
      setValue('endOdometer', matched.currentOdometer);
    }
  }, [manualVehicleId, vehicles, setValue]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tripsRes, vehRes] = await Promise.all([
        tripService.list({
          vehicleId: vehicleFilter || undefined,
          trackingType: typeFilter,
          limit: 50,
        }),
        vehicleService.list({ limit: 50 }),
      ]);
      setTrips(tripsRes.items);
      setVehicles(vehRes.items);
      if (vehRes.items.length > 0) {
        setValue('vehicleId', vehRes.items[0]._id);
      }
      const firstGps = tripsRes.items.find((t) => t.trackingType === 'gps');
      if (firstGps && !activeRide) {
        setSelectedTripId(firstGps._id);
        const detail = await tripService.getById(firstGps._id);
        setInspectedPoints(detail.locations);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load trips'));
    } finally {
      setIsLoading(false);
    }
  }, [vehicleFilter, typeFilter, setValue, activeRide]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const inspectTripRoute = async (trip: Trip) => {
    setSelectedTripId(trip._id);
    if (trip.trackingType !== 'gps') {
      setInspectedPoints([]);
      return;
    }
    try {
      const detail = await tripService.getById(trip._id);
      setInspectedPoints(detail.locations);
    } catch {
      setInspectedPoints([]);
    }
  };

  const onSubmitManual = async (values: ManualTripFormValues) => {
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
        purpose: 'Travel',
        duration: 30,
        startTime: new Date().toISOString().slice(0, 16),
      });
      setShowManualModal(false);
      await loadData();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to save manual trip'));
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

  const currency = preferences?.currency ?? 'INR';
  const distanceUnit = preferences?.distanceUnit ?? 'km';
  const fuelUnit = preferences?.fuelUnit ?? 'L';
  const mapPoints = activeRide ? livePoints : inspectedPoints;

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#171A18] dark:text-[#F4F3ED]">
            Bike Rides &amp; GPS Telemetry
          </h1>
          <p className="mt-1 text-sm text-[#5C615A] dark:text-[#B0B4AD]">
            Log petrol before riding, press Start Ride to detect location, and Stop Ride for KMs &amp; mileage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" onClick={() => setShowManualModal(true)}>
            <Plus className="h-4 w-4" /> Log Manual Trip
          </Button>
          {activeRide ? (
            <Button variant="danger" onClick={() => setShowStopRide(true)}>
              <Square className="h-4 w-4" /> Stop Ride
            </Button>
          ) : (
            <Button onClick={() => setShowStartRide(true)} disabled={vehicles.length === 0}>
              <Play className="h-4 w-4" /> Start Ride
            </Button>
          )}
        </div>
      </div>

      {/* Last Completed Ride Summary */}
      {lastCompletedRide && (
        <Card variant="sage" className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#23331A] dark:text-[#C5F467]">
              Ride Completed · {lastCompletedRide.startLocation || 'Origin'} →{' '}
              {lastCompletedRide.endLocation || 'Destination'}
            </p>
            <div className="mt-2 flex flex-wrap gap-5 text-sm text-[#171A18] dark:text-[#F4F3ED]">
              <span>
                KMs Driven:{' '}
                <strong className="tabular-nums">
                  {formatNumber(lastCompletedRide.distance, 2)} {distanceUnit}
                </strong>
              </span>
              <span>
                Duration: <strong className="tabular-nums">{lastCompletedRide.duration} min</strong>
              </span>
              {lastCompletedRide.rideSummary?.mileageKmPerUnit ? (
                <span>
                  Mileage:{' '}
                  <strong className="tabular-nums">
                    {lastCompletedRide.rideSummary.mileageKmPerUnit} {distanceUnit}/{fuelUnit}
                  </strong>
                </span>
              ) : null}
              {lastCompletedRide.rideSummary?.estimatedFuelCost ? (
                <span>
                  Est. Fuel Cost:{' '}
                  <strong className="tabular-nums">
                    {formatCurrency(lastCompletedRide.rideSummary.estimatedFuelCost, currency)}
                  </strong>
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={clearLastCompletedRide}
            className="self-start rounded-[8px] bg-[#171A18] px-3 py-1.5 text-xs font-semibold text-white sm:self-center dark:bg-[#C5F467] dark:text-[#171A18]"
          >
            Dismiss
          </button>
        </Card>
      )}

      {/* Interactive Map + Ride Controller */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <TripMap
            points={mapPoints}
            routePoints={activeRide ? routePoints : undefined}
            isLive={Boolean(activeRide)}
            liveDistanceKm={liveDistanceKm}
            accuracyMeters={liveAccuracy}
            distanceUnit={distanceUnit}
            className="h-80 w-full sm:h-96"
          />
        </div>

        <Card variant="dark" className="flex flex-col justify-between p-6 lg:col-span-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.09em] text-[#C5F467]">
                Ride Telemetry
              </span>
              {activeRide ? (
                <StatusIndicator tone="active" label="RIDING LIVE" />
              ) : (
                <Navigation className="h-4 w-4 text-[#A6AAA3]" />
              )}
            </div>

            {vehicles.length === 0 ? (
              <p className="mt-4 text-xs text-[#A6AAA3]">
                Please{' '}
                <Link to="/vehicles/new" className="font-semibold text-[#C5F467] underline">
                  register your bike
                </Link>{' '}
                before starting a ride.
              </p>
            ) : activeRide ? (
              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-xs text-[#A6AAA3]">Starting From</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">
                    {activeRide.startLocation || 'Current Location'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#A6AAA3]">Distance Driven (Road Matched)</p>
                  <p className="mt-1 text-3xl font-extrabold tabular-nums text-white">
                    {formatNumber(liveDistanceKm, 2)} {distanceUnit}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-[#2B302C] pt-4 text-xs">
                  <div>
                    <p className="text-[#A6AAA3]">Duration</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-[#C5F467]">
                      {formatTimer(elapsedSeconds)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#A6AAA3]">GPS Signal</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-white">
                      {livePoints.length} pts
                      {liveAccuracy ? (
                        <span className="ml-1 text-xs font-semibold text-[#C5F467]">
                          (±{liveAccuracy}m)
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-[#A6AAA3]">
                  {wakeLockActive ? 'Screen wake-lock active for uninterrupted tracking' : 'Background recovery & offline buffer enabled'}
                  {pendingSyncCount > 0 ? ` · ${pendingSyncCount} points queued for sync` : ''}
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <p className="text-sm font-semibold text-white">Ready for your next ride</p>
                <p className="text-xs leading-relaxed text-[#A6AAA3]">
                  Tap <strong>Start Ride</strong> to record optional pre-ride petrol (amount paid ÷
                  price/L = litres), auto-detect your location, and track KMs until you reach your
                  destination.
                </p>
              </div>
            )}

            {gpsNotice && <p className="mt-3 text-xs text-[#C5F467]">{gpsNotice}</p>}
          </div>

          <div className="mt-6">
            {activeRide ? (
              <Button variant="danger" className="w-full" onClick={() => setShowStopRide(true)}>
                <Square className="h-4 w-4" /> Stop Ride &amp; Calculate
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={vehicles.length === 0}
                onClick={() => setShowStartRide(true)}
              >
                <Play className="h-4 w-4" /> Start Ride
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            options={[
              { label: 'All Bikes / Vehicles', value: '' },
              ...vehicles.map((v) => ({ label: v.vehicleName, value: v._id })),
            ]}
          />
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'manual' | 'gps' | '')}
            options={[
              { label: 'All Tracking Modes', value: '' },
              { label: 'GPS Tracked Rides', value: 'gps' },
              { label: 'Manual Odometer', value: 'manual' },
            ]}
          />
        </div>
      </Card>

      {error && (
        <div className="rounded-[12px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318] dark:border-[#5C2320] dark:bg-[#2B1514] dark:text-[#FCA5A5]">
          {error}
        </div>
      )}

      {/* Trip History Timeline */}
      <Card className="overflow-hidden">
        <div className="border-b border-[#ECEAE2] px-6 py-4 dark:border-[#262B27]">
          <h2 className="text-base font-bold text-[#171A18] dark:text-[#F4F3ED]">Ride History Timeline</h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-sm text-[#7D827A] dark:text-[#8E938B]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading rides...
          </div>
        ) : trips.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Route className="mx-auto h-10 w-10 text-[#A6AAA3]" />
            <h3 className="mt-3 text-base font-bold text-[#171A18] dark:text-[#F4F3ED]">No rides recorded yet</h3>
            <p className="mt-1 text-sm text-[#5C615A] dark:text-[#B0B4AD]">
              Press Start Ride or log a manual odometer trip to begin tracking.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#ECEAE2] dark:divide-[#262B27]">
            {trips.map((trip) => {
              const vehicle = trip.vehicleId as VehicleRef;
              const isSelected = selectedTripId === trip._id;
              return (
                <div
                  key={trip._id}
                  onClick={() => void inspectTripRoute(trip)}
                  className={`flex cursor-pointer flex-col justify-between gap-4 px-6 py-4 transition-colors sm:flex-row sm:items-center ${
                    isSelected
                      ? 'bg-[#FAF9F5] dark:bg-[#1E221F]'
                      : 'hover:bg-[#FAF9F5] dark:hover:bg-[#1E221F]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#171A18] dark:text-[#C5F467]" />
                      <span className="text-sm font-bold text-[#171A18] dark:text-[#F4F3ED]">
                        {trip.startLocation || 'Origin'} → {trip.endLocation || 'Destination'}
                      </span>
                      <Badge variant={trip.trackingType === 'gps' ? 'lime' : 'sage'}>
                        {trip.trackingType.toUpperCase()}
                      </Badge>
                      {trip.purpose && <Badge variant="neutral">{trip.purpose}</Badge>}
                    </div>
                    <p className="text-xs text-[#7D827A] dark:text-[#8E938B]">
                      {vehicle?.vehicleName ?? 'Bike'} · {formatDate(trip.startTime)} ·{' '}
                      {trip.duration} min
                      {trip.trackingType === 'gps' ? ' · Click to plot route' : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-extrabold tabular-nums text-[#171A18] dark:text-[#F4F3ED]">
                        {formatNumber(trip.distance, 2)} {distanceUnit}
                      </p>
                      {trip.startOdometer !== undefined && trip.endOdometer !== undefined && (
                        <p className="text-xs tabular-nums text-[#7D827A] dark:text-[#8E938B]">
                          {formatNumber(trip.startOdometer, 0)} → {formatNumber(trip.endOdometer, 0)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(trip._id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-[#B42318] dark:text-[#F87171]" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={showManualModal}
        onClose={() => setShowManualModal(false)}
        title="Log Manual Trip"
        subtitle="Distance is calculated automatically from ending minus starting odometer."
      >
        <form onSubmit={handleSubmit(onSubmitManual)} className="space-y-4">
          {formError && (
            <div className="rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-2.5 text-sm text-[#B42318] dark:border-[#5C2320] dark:bg-[#2B1514] dark:text-[#FCA5A5]">
              {formError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Bike / Vehicle"
              options={vehicles.map((v) => ({
                label: `${v.vehicleName} (${v.registrationNumber})`,
                value: v._id,
              }))}
              {...register('vehicleId', { required: true })}
            />
            <Select
              label="Purpose"
              options={[
                { label: 'Travel', value: 'Travel' },
                { label: 'Commute', value: 'Commute' },
                { label: 'Road Trip', value: 'Road Trip' },
                { label: 'Errand', value: 'Errand' },
                { label: 'Delivery', value: 'Delivery' },
              ]}
              {...register('purpose')}
            />
            <Input label="Start Location" placeholder="Origin" {...register('startLocation')} />
            <Input label="Destination" placeholder="Destination" {...register('endLocation')} />
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
            <Input label="Duration (minutes)" type="number" {...register('duration')} />
            <Input label="Trip Date & Time" type="datetime-local" {...register('startTime')} />
          </div>
          <div className="rounded-[10px] bg-[#FAF9F5] px-4 py-2.5 text-xs text-[#5C615A] dark:bg-[#1E221F] dark:text-[#B0B4AD]">
            Calculated Distance:{' '}
            <strong className="text-sm tabular-nums text-[#171A18] dark:text-[#C5F467]">
              {computedDistance} {distanceUnit}
            </strong>
          </div>
          <Input label="Notes" placeholder="Optional notes" {...register('notes')} />
          <div className="flex justify-end gap-3 border-t border-[#ECEAE2] pt-4 dark:border-[#262B27]">
            <Button type="button" variant="outline" onClick={() => setShowManualModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Trip
            </Button>
          </div>
        </form>
      </Modal>

      <StartRideModal
        open={showStartRide}
        onClose={() => setShowStartRide(false)}
        vehicles={vehicles}
        onStarted={() => void loadData()}
      />

      <StopRideModal
        open={showStopRide}
        onClose={() => setShowStopRide(false)}
        onCompleted={() => void loadData()}
      />
    </div>
  );
}
