import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { fuelService } from '../services/fuelService';
import { tripService } from '../services/tripService';
import { PaymentMethod, Trip, TripLocationPoint } from '../types';
import {
  buildRoadAwarePath,
  calculatePolylineDistanceKm,
  detectCurrentPosition,
  haversineDistanceKm,
  reverseGeocodeLabel,
} from '../utils/location';
import { useAuth } from './AuthContext';

const LAST_PETROL_PRICE_KEY = 'vehixa_last_petrol_price';
const RIDE_PENDING_PREFIX = 'vehixa_ride_pending_';
const RIDE_ALL_PREFIX = 'vehixa_ride_all_';
const MAX_TRACK_ACCURACY_METERS = 200;

interface WakeLockSentinelLike {
  released?: boolean;
  release: () => Promise<void>;
}

export interface PreRideFuelInput {
  fuelType: 'Petrol' | 'Diesel' | 'CNG' | 'EV charging';
  totalAmount: number;
  unitPrice: number;
  odometer: number;
  isFullTank: boolean;
  paymentMethod: PaymentMethod;
}

export interface StartRideOptions {
  vehicleId: string;
  purpose?: string;
  startLocation?: string;
  initialPoint?: TripLocationPoint | null;
  notes?: string;
  preRideFuel?: PreRideFuelInput;
}

export interface StopRideOptions {
  endLocation?: string;
  finalPoint?: TripLocationPoint | null;
  endOdometer?: number;
  notes?: string;
}

interface RideContextValue {
  activeRide: Trip | null;
  livePoints: TripLocationPoint[];
  routePoints: TripLocationPoint[];
  liveDistanceKm: number;
  liveAccuracy: number | null;
  elapsedSeconds: number;
  wakeLockActive: boolean;
  pendingSyncCount: number;
  isBusy: boolean;
  gpsNotice: string | null;
  lastCompletedRide: Trip | null;
  lastPetrolPrice: string;
  startRide: (opts: StartRideOptions) => Promise<Trip>;
  stopRide: (opts?: StopRideOptions) => Promise<Trip | null>;
  clearLastCompletedRide: () => void;
}

const RideContext = createContext<RideContextValue | undefined>(undefined);

function readStoredPoints(key: string): TripLocationPoint[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TripLocationPoint[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredPoints(key: string, points: TripLocationPoint[]): void {
  try {
    if (points.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(points));
    }
  } catch {
    // Ignore storage quota issues
  }
}

function mergeUniquePoints(
  base: TripLocationPoint[],
  extra: TripLocationPoint[],
): TripLocationPoint[] {
  const combined = [...base, ...extra].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
  const deduped: TripLocationPoint[] = [];
  for (const pt of combined) {
    const last = deduped[deduped.length - 1];
    if (
      last &&
      Math.abs(new Date(pt.recordedAt).getTime() - new Date(last.recordedAt).getTime()) < 1000 &&
      Math.abs(pt.latitude - last.latitude) < 1e-6 &&
      Math.abs(pt.longitude - last.longitude) < 1e-6
    ) {
      continue;
    }
    deduped.push(pt);
  }
  return deduped;
}

export function RideProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [activeRide, setActiveRide] = useState<Trip | null>(null);
  const [livePoints, setLivePoints] = useState<TripLocationPoint[]>([]);
  const [routePoints, setRoutePoints] = useState<TripLocationPoint[]>([]);
  const [liveDistanceKm, setLiveDistanceKm] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [lastCompletedRide, setLastCompletedRide] = useState<Trip | null>(null);
  const [lastPetrolPrice, setLastPetrolPrice] = useState<string>(
    () => localStorage.getItem(LAST_PETROL_PRICE_KEY) || '102',
  );

  const activeTripIdRef = useRef<string | null>(null);
  const livePointsRef = useRef<TripLocationPoint[]>([]);
  const pendingQueueRef = useRef<TripLocationPoint[]>([]);
  const backendDistanceRef = useRef<number>(0);
  const lastFixAtRef = useRef<number>(0);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const syncingRef = useRef<boolean>(false);

  const releaseWakeLock = useCallback(async () => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    setWakeLockActive(false);
    if (lock) {
      try {
        await lock.release();
      } catch {
        // Ignore already-released errors
      }
    }
  }, []);

  const acquireWakeLock = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
    };
    if (!nav.wakeLock) return;
    try {
      const sentinel = await nav.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);
    } catch {
      setWakeLockActive(false);
    }
  }, []);

  const stopTrackers = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (watchdogRef.current !== null) {
      window.clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
    void releaseWakeLock();
  }, [releaseWakeLock]);

  // Recompute road-matched route & live distance whenever breadcrumbs update
  useEffect(() => {
    livePointsRef.current = livePoints;
    if (livePoints.length === 0) {
      setRoutePoints([]);
      return;
    }

    let cancelled = false;
    const rawLocalKm = calculatePolylineDistanceKm(livePoints);
    const baseline = Math.max(backendDistanceRef.current, rawLocalKm);
    setLiveDistanceKm(Number(baseline.toFixed(2)));
    setRoutePoints(livePoints);

    if (livePoints.length >= 2) {
      void buildRoadAwarePath(livePoints).then((res) => {
        if (cancelled) return;
        setRoutePoints(res.pathPoints);
        const bestKm = Math.max(
          backendDistanceRef.current,
          rawLocalKm,
          res.snappedGaps > 0 ? res.distanceKm : 0,
        );
        setLiveDistanceKm(Number(bestKm.toFixed(2)));
      });
    }

    return () => {
      cancelled = true;
    };
  }, [livePoints]);

  const flushPendingPoints = useCallback(async (tripId: string) => {
    if (syncingRef.current || pendingQueueRef.current.length === 0) return;
    syncingRef.current = true;
    try {
      const batch = [...pendingQueueRef.current];
      const res = await tripService.pushLocations(tripId, batch);
      backendDistanceRef.current = Math.max(backendDistanceRef.current, res.totalDistance);

      // Remove flushed prefix (keep any newly arrived points while request was in flight)
      pendingQueueRef.current = pendingQueueRef.current.slice(batch.length);
      writeStoredPoints(`${RIDE_PENDING_PREFIX}${tripId}`, pendingQueueRef.current);
      setPendingSyncCount(pendingQueueRef.current.length);
    } catch {
      // Offline or transient network drop: keep queue safely in localStorage for automatic retry
    } finally {
      syncingRef.current = false;
    }
  }, []);

  const acceptIncomingCoordinate = useCallback(
    (tripId: string, pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy, speed } = pos.coords;
      const recordedAt = new Date(pos.timestamp || Date.now()).toISOString();
      lastFixAtRef.current = Date.now();
      setLiveAccuracy(Math.round(accuracy));

      if (accuracy > MAX_TRACK_ACCURACY_METERS) {
        if (livePointsRef.current.length === 0) {
          setGpsNotice(`Waiting for sharper GPS satellite lock (current ±${Math.round(accuracy)}m)...`);
        }
        return;
      }

      const prev = livePointsRef.current[livePointsRef.current.length - 1];
      if (prev) {
        const segKm = haversineDistanceKm(prev.latitude, prev.longitude, latitude, longitude);
        const dtSec = Math.max(
          0.5,
          (new Date(recordedAt).getTime() - new Date(prev.recordedAt).getTime()) / 1000,
        );
        const impliedKmh = segKm / (dtSec / 3600);

        if (dtSec < 30 && impliedKmh > 220) {
          return;
        }
        if (segKm < 0.006 && dtSec < 20) {
          return;
        }
        if (segKm < 0.003) {
          return;
        }
      }

      setGpsNotice(null);
      const point: TripLocationPoint = {
        latitude,
        longitude,
        accuracy,
        speed: speed ?? undefined,
        recordedAt,
      };

      const nextAll = mergeUniquePoints(livePointsRef.current, [point]);
      livePointsRef.current = nextAll;
      setLivePoints(nextAll);
      writeStoredPoints(`${RIDE_ALL_PREFIX}${tripId}`, nextAll);

      pendingQueueRef.current = [...pendingQueueRef.current, point];
      writeStoredPoints(`${RIDE_PENDING_PREFIX}${tripId}`, pendingQueueRef.current);
      setPendingSyncCount(pendingQueueRef.current.length);

      void flushPendingPoints(tripId);
    },
    [flushPendingPoints],
  );

  const sampleOnceAndFlush = useCallback(
    (tripId: string) => {
      void flushPendingPoints(tripId);
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => acceptIncomingCoordinate(tripId, pos),
          () => {
            // Keep existing watch running
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 },
        );
      }
    },
    [acceptIncomingCoordinate, flushPendingPoints],
  );

  const beginLiveWatch = useCallback(
    (tripId: string, startMs: number) => {
      stopTrackers();
      activeTripIdRef.current = tripId;
      lastFixAtRef.current = Date.now();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
      void acquireWakeLock();

      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
      }, 1000);

      if ('geolocation' in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => acceptIncomingCoordinate(tripId, pos),
          (geoErr) => {
            setGpsNotice(
              geoErr.code === 1
                ? 'Location permission denied. Re-enable GPS permissions in browser.'
                : `GPS reconnecting: ${geoErr.message}`,
            );
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
        );

        // Keepalive watchdog: flush pending offline points & poll GPS if Android/iOS stalls watchPosition
        watchdogRef.current = window.setInterval(() => {
          if (pendingQueueRef.current.length > 0) {
            void flushPendingPoints(tripId);
          }
          if (document.visibilityState === 'visible' && Date.now() - lastFixAtRef.current > 10000) {
            sampleOnceAndFlush(tripId);
          }
        }, 10000);
      } else {
        setGpsNotice('Browser geolocation unavailable; enter end odometer when stopping.');
      }
    },
    [stopTrackers, acquireWakeLock, acceptIncomingCoordinate, flushPendingPoints, sampleOnceAndFlush],
  );

  // Instant resume on screen unlock / tab return / network reconnect
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      const tripId = activeTripIdRef.current;
      if (!tripId) return;
      if (document.visibilityState === 'visible') {
        void acquireWakeLock();
        sampleOnceAndFlush(tripId);
      }
    };

    const handleOnline = () => {
      const tripId = activeTripIdRef.current;
      if (!tripId) return;
      void flushPendingPoints(tripId);
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [acquireWakeLock, sampleOnceAndFlush, flushPendingPoints]);

  // Restore any in-progress ride on reload (merging MongoDB points + local offline buffered points)
  useEffect(() => {
    if (!isAuthenticated) {
      stopTrackers();
      activeTripIdRef.current = null;
      setActiveRide(null);
      setLivePoints([]);
      setRoutePoints([]);
      return;
    }

    let mounted = true;
    async function restoreActive() {
      try {
        const res = await tripService.list({ trackingType: 'gps', limit: 5 });
        const inProgress = res.items.find((t) => t.status === 'in_progress');
        if (!mounted || !inProgress) return;
        const detail = await tripService.getById(inProgress._id);
        if (!mounted) return;

        const storedAll = readStoredPoints(`${RIDE_ALL_PREFIX}${detail.trip._id}`);
        const storedPending = readStoredPoints(`${RIDE_PENDING_PREFIX}${detail.trip._id}`);
        const merged = mergeUniquePoints(detail.locations, mergeUniquePoints(storedAll, storedPending));

        backendDistanceRef.current = detail.trip.distance;
        pendingQueueRef.current = storedPending;
        setPendingSyncCount(storedPending.length);

        setActiveRide(detail.trip);
        livePointsRef.current = merged;
        setLivePoints(merged);

        if (merged.length > 0 && merged[merged.length - 1].accuracy) {
          setLiveAccuracy(Math.round(merged[merged.length - 1].accuracy!));
        }

        beginLiveWatch(detail.trip._id, new Date(detail.trip.startTime).getTime());
        if (storedPending.length > 0) {
          void flushPendingPoints(detail.trip._id);
        }
      } catch {
        // Ignore restore failure
      }
    }
    void restoreActive();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, beginLiveWatch, stopTrackers, flushPendingPoints]);

  useEffect(() => stopTrackers, [stopTrackers]);

  const startRide = async (opts: StartRideOptions): Promise<Trip> => {
    setIsBusy(true);
    setGpsNotice(null);
    setLastCompletedRide(null);

    try {
      if (opts.preRideFuel) {
        const { unitPrice, totalAmount, fuelType, odometer, isFullTank, paymentMethod } =
          opts.preRideFuel;
        localStorage.setItem(LAST_PETROL_PRICE_KEY, String(unitPrice));
        setLastPetrolPrice(String(unitPrice));

        await fuelService.create({
          vehicleId: opts.vehicleId,
          fuelType,
          totalAmount,
          unitPrice,
          odometer,
          isFullTank,
          paymentMethod,
          description: `Pre-ride ${fuelType} fill-up`,
        });
      }

      let detectedStart = opts.startLocation?.trim() || '';
      let firstPoint: TripLocationPoint | null = opts.initialPoint ?? null;

      if (!firstPoint) {
        try {
          const pos = await detectCurrentPosition({ desiredAccuracyMeters: 25, maxWaitMs: 4000 });
          if (!detectedStart) detectedStart = pos.label;
          firstPoint = {
            latitude: pos.latitude,
            longitude: pos.longitude,
            accuracy: pos.accuracy,
            speed: pos.speed ?? undefined,
            recordedAt: new Date(pos.timestamp).toISOString(),
          };
        } catch (locErr) {
          if (!detectedStart) detectedStart = 'Current Location';
          setGpsNotice(locErr instanceof Error ? locErr.message : 'GPS unavailable');
        }
      } else if (!detectedStart) {
        detectedStart = await reverseGeocodeLabel(firstPoint.latitude, firstPoint.longitude);
      }

      const trip = await tripService.startGps({
        vehicleId: opts.vehicleId,
        startLocation: detectedStart,
        purpose: opts.purpose || 'Travel',
        notes: opts.notes,
      });

      backendDistanceRef.current = 0;
      pendingQueueRef.current = [];
      setPendingSyncCount(0);
      setActiveRide(trip);
      setLiveDistanceKm(0);

      if (firstPoint) {
        if (firstPoint.accuracy) setLiveAccuracy(Math.round(firstPoint.accuracy));
        const initialList = [firstPoint];
        livePointsRef.current = initialList;
        setLivePoints(initialList);
        writeStoredPoints(`${RIDE_ALL_PREFIX}${trip._id}`, initialList);

        try {
          await tripService.pushLocations(trip._id, initialList);
        } catch {
          pendingQueueRef.current = initialList;
          writeStoredPoints(`${RIDE_PENDING_PREFIX}${trip._id}`, initialList);
          setPendingSyncCount(1);
        }
      } else {
        livePointsRef.current = [];
        setLivePoints([]);
      }

      beginLiveWatch(trip._id, new Date(trip.startTime).getTime());
      return trip;
    } finally {
      setIsBusy(false);
    }
  };

  const stopRide = async (opts: StopRideOptions = {}): Promise<Trip | null> => {
    if (!activeRide) return null;
    setIsBusy(true);
    stopTrackers();
    const tripId = activeRide._id;

    try {
      let endLocation = opts.endLocation?.trim() || '';
      let finalPoint: TripLocationPoint | null = opts.finalPoint ?? null;

      if (!finalPoint) {
        try {
          const detected = await detectCurrentPosition({ desiredAccuracyMeters: 25, maxWaitMs: 3500 });
          if (!endLocation) endLocation = detected.label;
          finalPoint = {
            latitude: detected.latitude,
            longitude: detected.longitude,
            accuracy: detected.accuracy,
            speed: detected.speed ?? undefined,
            recordedAt: new Date(detected.timestamp).toISOString(),
          };
        } catch {
          const lastPt = livePointsRef.current[livePointsRef.current.length - 1];
          if (!endLocation) {
            endLocation = lastPt
              ? await reverseGeocodeLabel(lastPt.latitude, lastPt.longitude)
              : 'Destination';
          }
        }
      } else if (!endLocation) {
        endLocation = await reverseGeocodeLabel(finalPoint.latitude, finalPoint.longitude);
      }

      if (finalPoint) {
        const lastPt = livePointsRef.current[livePointsRef.current.length - 1];
        const movedKm = lastPt
          ? haversineDistanceKm(lastPt.latitude, lastPt.longitude, finalPoint.latitude, finalPoint.longitude)
          : 1;
        if (!lastPt || movedKm >= 0.005) {
          livePointsRef.current = mergeUniquePoints(livePointsRef.current, [finalPoint]);
          pendingQueueRef.current = [...pendingQueueRef.current, finalPoint];
        }
      }

      // Flush any unsynced points before finalizing distance
      await flushPendingPoints(tripId);

      // Compute final road-aware distance across any screen-lock gaps
      let computedDistanceKm: number | undefined;
      if (opts.endOdometer === undefined && livePointsRef.current.length >= 2) {
        const rawKm = calculatePolylineDistanceKm(livePointsRef.current);
        const road = await buildRoadAwarePath(livePointsRef.current);
        const bestKm = Math.max(
          backendDistanceRef.current,
          rawKm,
          road.snappedGaps > 0 ? road.distanceKm : 0,
        );
        if (bestKm > backendDistanceRef.current) {
          computedDistanceKm = Number(bestKm.toFixed(2));
        }
      }

      const completed = await tripService.completeGps(tripId, {
        endLocation,
        endOdometer: opts.endOdometer,
        distanceKm: computedDistanceKm,
        notes: opts.notes,
      });

      localStorage.removeItem(`${RIDE_PENDING_PREFIX}${tripId}`);
      localStorage.removeItem(`${RIDE_ALL_PREFIX}${tripId}`);

      activeTripIdRef.current = null;
      backendDistanceRef.current = 0;
      pendingQueueRef.current = [];
      livePointsRef.current = [];

      setPendingSyncCount(0);
      setActiveRide(null);
      setLivePoints([]);
      setRoutePoints([]);
      setLiveDistanceKm(0);
      setLiveAccuracy(null);
      setElapsedSeconds(0);
      setLastCompletedRide(completed);
      return completed;
    } finally {
      setIsBusy(false);
    }
  };

  const clearLastCompletedRide = () => setLastCompletedRide(null);

  return (
    <RideContext.Provider
      value={{
        activeRide,
        livePoints,
        routePoints,
        liveDistanceKm,
        liveAccuracy,
        elapsedSeconds,
        wakeLockActive,
        pendingSyncCount,
        isBusy,
        gpsNotice,
        lastCompletedRide,
        lastPetrolPrice,
        startRide,
        stopRide,
        clearLastCompletedRide,
      }}
    >
      {children}
    </RideContext.Provider>
  );
}

export function useRide(): RideContextValue {
  const ctx = useContext(RideContext);
  if (!ctx) throw new Error('useRide must be used within RideProvider');
  return ctx;
}
