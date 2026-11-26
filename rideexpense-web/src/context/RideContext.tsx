import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { fuelService } from '../services/fuelService';
import { tripService } from '../services/tripService';
import { PaymentMethod, Trip, TripLocationPoint } from '../types';
import { detectCurrentPosition, reverseGeocodeLabel } from '../utils/location';
import { useAuth } from './AuthContext';

const LAST_PETROL_PRICE_KEY = 'vehixa_last_petrol_price';

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
  notes?: string;
  preRideFuel?: PreRideFuelInput;
}

export interface StopRideOptions {
  endLocation?: string;
  endOdometer?: number;
  notes?: string;
}

interface RideContextValue {
  activeRide: Trip | null;
  livePoints: TripLocationPoint[];
  liveDistanceKm: number;
  elapsedSeconds: number;
  isBusy: boolean;
  gpsNotice: string | null;
  lastCompletedRide: Trip | null;
  lastPetrolPrice: string;
  startRide: (opts: StartRideOptions) => Promise<Trip>;
  stopRide: (opts?: StopRideOptions) => Promise<Trip | null>;
  clearLastCompletedRide: () => void;
}

const RideContext = createContext<RideContextValue | undefined>(undefined);

export function RideProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [activeRide, setActiveRide] = useState<Trip | null>(null);
  const [livePoints, setLivePoints] = useState<TripLocationPoint[]>([]);
  const [liveDistanceKm, setLiveDistanceKm] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [lastCompletedRide, setLastCompletedRide] = useState<Trip | null>(null);
  const [lastPetrolPrice, setLastPetrolPrice] = useState<string>(
    () => localStorage.getItem(LAST_PETROL_PRICE_KEY) || '102',
  );

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const stopTrackers = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const beginLiveWatch = useCallback(
    (tripId: string, startMs: number) => {
      stopTrackers();
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
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
              const res = await tripService.pushLocations(tripId, [point]);
              if (res.acceptedCount > 0) {
                setLivePoints((prev) => [...prev, point]);
                setLiveDistanceKm(res.totalDistance);
              }
            } catch {
              // Keep tracking on transient sync glitches
            }
          },
          (geoErr) => {
            setGpsNotice(`Location signal notice: ${geoErr.message}`);
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
        );
      } else {
        setGpsNotice('Browser geolocation unavailable; enter end odometer when stopping.');
      }
    },
    [stopTrackers],
  );

  // Restore any in-progress ride on reload
  useEffect(() => {
    if (!isAuthenticated) {
      stopTrackers();
      setActiveRide(null);
      setLivePoints([]);
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
        setActiveRide(detail.trip);
        setLivePoints(detail.locations);
        setLiveDistanceKm(detail.trip.distance);
        beginLiveWatch(detail.trip._id, new Date(detail.trip.startTime).getTime());
      } catch {
        // Ignore restore failure
      }
    }
    void restoreActive();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated, beginLiveWatch, stopTrackers]);

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
      let firstPoint: TripLocationPoint | null = null;

      try {
        const pos = await detectCurrentPosition();
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

      const trip = await tripService.startGps({
        vehicleId: opts.vehicleId,
        startLocation: detectedStart,
        purpose: opts.purpose || 'Travel',
        notes: opts.notes,
      });

      setActiveRide(trip);
      setLiveDistanceKm(0);

      if (firstPoint) {
        try {
          await tripService.pushLocations(trip._id, [firstPoint]);
          setLivePoints([firstPoint]);
        } catch {
          setLivePoints([]);
        }
      } else {
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

    try {
      let endLocation = opts.endLocation?.trim() || '';
      if (!endLocation) {
        try {
          const finalPos = await detectCurrentPosition();
          endLocation = finalPos.label;
          await tripService.pushLocations(activeRide._id, [
            {
              latitude: finalPos.latitude,
              longitude: finalPos.longitude,
              accuracy: finalPos.accuracy,
              speed: finalPos.speed ?? undefined,
              recordedAt: new Date(finalPos.timestamp).toISOString(),
            },
          ]);
        } catch {
          const lastPt = livePoints[livePoints.length - 1];
          endLocation = lastPt
            ? await reverseGeocodeLabel(lastPt.latitude, lastPt.longitude)
            : 'Destination';
        }
      }

      const completed = await tripService.completeGps(activeRide._id, {
        endLocation,
        endOdometer: opts.endOdometer,
        notes: opts.notes,
      });

      setActiveRide(null);
      setLivePoints([]);
      setLiveDistanceKm(0);
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
        liveDistanceKm,
        elapsedSeconds,
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
