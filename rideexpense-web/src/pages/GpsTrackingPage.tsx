import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPin, Navigation, Play, Square } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { tripService } from '../services/tripService';
import { vehicleService } from '../services/vehicleService';
import { Trip, TripLocationPoint, Vehicle } from '../types';
import { formatNumber, getApiErrorMessage } from '../utils/formatters';

export function GpsTrackingPage() {
  const { preferences } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [purpose, setPurpose] = useState('Commute');
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [points, setPoints] = useState<TripLocationPoint[]>([]);
  const [liveDistanceKm, setLiveDistanceKm] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedTrip, setCompletedTrip] = useState<Trip | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await vehicleService.list({ limit: 50 });
        setVehicles(res.items);
        if (res.items.length > 0) setSelectedVehicleId(res.items[0]._id);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Unable to load vehicles'));
      } finally {
        setIsLoading(false);
      }
    }
    void load();

    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRide = async () => {
    if (!selectedVehicleId) return;
    setError(null);
    setCompletedTrip(null);
    setIsBusy(true);

    try {
      const trip = await tripService.startGps({
        vehicleId: selectedVehicleId,
        startLocation: startLocation || undefined,
        purpose,
      });
      setActiveTrip(trip);
      setPoints([]);
      setLiveDistanceKm(0);
      setElapsedSeconds(0);

      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      if ('geolocation' in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const point: TripLocationPoint = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              speed: pos.coords.speed ?? undefined,
              recordedAt: new Date(pos.timestamp).toISOString(),
            };
            try {
              const res = await tripService.pushLocations(trip._id, [point]);
              if (res.acceptedCount > 0) {
                setPoints((prev) => [...prev, point]);
                setLiveDistanceKm(res.totalDistance);
              }
            } catch {
              // Keep watching; transient sync errors shouldn't break UI timer
            }
          },
          (geoErr) => {
            setError(`Location permission / signal notice: ${geoErr.message}`);
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
        );
      } else {
        setError('Browser geolocation is unavailable in this environment.');
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to start GPS ride'));
    } finally {
      setIsBusy(false);
    }
  };

  const stopRide = async () => {
    if (!activeTrip) return;
    setIsBusy(true);
    setError(null);

    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      const done = await tripService.completeGps(activeTrip._id, {
        endLocation: endLocation || undefined,
      });
      setCompletedTrip(done);
      setActiveTrip(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to complete ride'));
    } finally {
      setIsBusy(false);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const distanceUnit = preferences?.distanceUnit ?? 'km';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          GPS Trip Tracking
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Permission-based browser location tracking with server-side accuracy &amp; jump filtering.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          {error}
        </div>
      )}

      {completedTrip && (
        <Card className="border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Trip completed &amp; saved
              </p>
              <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                Distance: {formatNumber(completedTrip.distance, 2)} {distanceUnit} · Duration:{' '}
                {completedTrip.duration} min
              </p>
            </div>
            <Link to="/trips" className="text-sm font-semibold text-electric-600 hover:underline">
              View Trips
            </Link>
          </div>
        </Card>
      )}

      <Card className="p-6 sm:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-electric-600" />
            Loading vehicles...
          </div>
        ) : vehicles.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Please{' '}
            <Link to="/vehicles/new" className="font-semibold text-electric-600 hover:underline">
              register a vehicle
            </Link>{' '}
            before starting GPS tracking.
          </p>
        ) : !activeTrip ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Select Vehicle"
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                options={vehicles.map((v) => ({
                  label: `${v.vehicleName} (${v.registrationNumber})`,
                  value: v._id,
                }))}
              />
              <Select
                label="Trip Purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                options={[
                  { label: 'Commute', value: 'Commute' },
                  { label: 'Business', value: 'Business' },
                  { label: 'Personal', value: 'Personal' },
                  { label: 'Delivery', value: 'Delivery' },
                  { label: 'Road Trip', value: 'Road Trip' },
                ]}
              />
            </div>
            <Input
              label="Starting Label (optional)"
              placeholder="e.g. Downtown Office"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
            />
            <Button onClick={startRide} isLoading={isBusy} className="w-full sm:w-auto">
              <Play className="h-4 w-4" />
              Start GPS Ride
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Navigation className="h-5 w-5 animate-pulse text-electric-600" />
                <span className="text-base font-semibold text-slate-900 dark:text-white">
                  Ride in Progress
                </span>
              </div>
              <Badge variant="green">LIVE</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">Live Distance</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {formatNumber(liveDistanceKm, 2)} {distanceUnit}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">Duration</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {formatTimer(elapsedSeconds)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">Accepted Points</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {points.length}
                </p>
              </div>
            </div>

            <Input
              label="Destination Label (optional)"
              placeholder="e.g. Home"
              value={endLocation}
              onChange={(e) => setEndLocation(e.target.value)}
            />

            {points.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800">
                {points.slice(-5).map((pt, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-1 text-slate-600 dark:text-slate-300">
                    <MapPin className="h-3.5 w-3.5 text-electric-600" />
                    <span>
                      {pt.latitude.toFixed(5)}, {pt.longitude.toFixed(5)}
                      {pt.accuracy ? ` (±${Math.round(pt.accuracy)}m)` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button variant="danger" onClick={stopRide} isLoading={isBusy}>
              <Square className="h-4 w-4" />
              Stop &amp; Save Ride
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
