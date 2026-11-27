import { useCallback, useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, Navigation, RefreshCw, Square } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useRide } from '../context/RideContext';
import { TripLocationPoint } from '../types';
import { formatNumber, getApiErrorMessage } from '../utils/formatters';
import { DetectedCoordinate, detectCurrentPosition } from '../utils/location';

export function StopRideModal({
  open,
  onClose,
  onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}) {
  const { preferences } = useAuth();
  const { activeRide, liveDistanceKm, stopRide, isBusy } = useRide();
  const [endLocation, setEndLocation] = useState('');
  const [detectedCoord, setDetectedCoord] = useState<DetectedCoordinate | null>(null);
  const [endOdometer, setEndOdometer] = useState('');
  const [notes, setNotes] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [locHint, setLocHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detectEpochRef = useRef(0);

  const runExactDetection = useCallback(async () => {
    const epoch = ++detectEpochRef.current;
    setDetecting(true);
    setLocHint(null);
    try {
      const pos = await detectCurrentPosition({ desiredAccuracyMeters: 25, maxWaitMs: 4500 });
      if (detectEpochRef.current !== epoch) return;
      setDetectedCoord(pos);
      setEndLocation(pos.label);
    } catch (err) {
      if (detectEpochRef.current !== epoch) return;
      setLocHint(err instanceof Error ? err.message : 'Unable to lock destination GPS');
    } finally {
      if (detectEpochRef.current === epoch) {
        setDetecting(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!open || !activeRide) {
      detectEpochRef.current += 1;
      return;
    }
    setError(null);
    setEndOdometer('');
    setNotes('');
    setDetectedCoord(null);
    void runExactDetection();
  }, [open, activeRide, runExactDetection]);

  const distanceUnit = preferences?.distanceUnit ?? 'km';

  const handleStop = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalPoint: TripLocationPoint | null = detectedCoord
      ? {
          latitude: detectedCoord.latitude,
          longitude: detectedCoord.longitude,
          accuracy: detectedCoord.accuracy,
          speed: detectedCoord.speed ?? undefined,
          recordedAt: new Date(detectedCoord.timestamp).toISOString(),
        }
      : null;

    try {
      await stopRide({
        endLocation: endLocation || undefined,
        finalPoint,
        endOdometer: endOdometer ? Number(endOdometer) : undefined,
        notes: notes || undefined,
      });
      onClose();
      onCompleted?.();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not complete ride.'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Stop Ride & Calculate Summary"
      subtitle="Confirm your destination to calculate exact road KMs, bike mileage, and fuel cost."
    >
      <form onSubmit={handleStop} className="space-y-4">
        {error && (
          <div className="rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-2.5 text-sm text-[#B42318] dark:border-[#5C2320] dark:bg-[#2B1514] dark:text-[#FCA5A5]">
            {error}
          </div>
        )}

        <div className="rounded-[10px] border border-[#262A27] bg-[#171A18] px-4 py-3 text-white dark:border-[#323833] dark:bg-[#121513]">
          <p className="text-xs text-[#A6AAA3]">GPS &amp; Road Matched Distance</p>
          <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-[#C5F467]">
            {formatNumber(liveDistanceKm, 2)} {distanceUnit}
          </p>
        </div>

        <div className="rounded-[10px] border border-[#E4E2D9] bg-[#FAF9F5] p-3.5 dark:border-[#2B302C] dark:bg-[#1E221F]">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#5C615A] dark:text-[#B0B4AD]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#171A18] dark:text-[#C5F467]" />
              Exact Destination Location
            </span>
            <div className="flex items-center gap-2">
              {detecting ? (
                <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#DCE8D0] px-2 py-0.5 text-[11px] font-semibold text-[#23331A] dark:bg-[#1E2E18] dark:text-[#C5F467]">
                  <Navigation className="h-3 w-3 animate-pulse" /> Locking...
                </span>
              ) : detectedCoord ? (
                <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#C5F467] px-2 py-0.5 text-[11px] font-bold text-[#171A18]">
                  <LocateFixed className="h-3 w-3" />
                  {detectedCoord.accuracy ? `±${Math.round(detectedCoord.accuracy)}m` : 'Locked'}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => void runExactDetection()}
                disabled={detecting}
                className="inline-flex items-center gap-1 rounded-[6px] border border-[#DCDAD0] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#171A18] hover:bg-[#F4F3ED] disabled:opacity-60 dark:border-[#343A35] dark:bg-[#171A18] dark:text-[#F4F3ED] dark:hover:bg-[#232724]"
              >
                <RefreshCw className={`h-3 w-3 ${detecting ? 'animate-spin' : ''}`} />
                Re-detect
              </button>
            </div>
          </div>

          <input
            type="text"
            value={endLocation}
            onChange={(e) => setEndLocation(e.target.value)}
            placeholder="Detected destination or enter place name"
            className="w-full rounded-[8px] border border-[#DCDAD0] bg-white px-3 py-2 text-sm text-[#171A18] placeholder-[#A6AAA3] focus:border-[#171A18] focus:outline-none dark:border-[#343A35] dark:bg-[#171A18] dark:text-[#F4F3ED] dark:placeholder-[#7D827A] dark:focus:border-[#C5F467]"
          />

          {detectedCoord && (
            <p className="mt-1.5 text-[11px] tabular-nums text-[#7D827A] dark:text-[#8E938B]">
              GPS: {detectedCoord.latitude.toFixed(5)}, {detectedCoord.longitude.toFixed(5)}
            </p>
          )}
          {locHint && (
            <p className="mt-1 text-[11px] font-medium text-[#B42318] dark:text-[#FCA5A5]">
              {locHint}
            </p>
          )}
        </div>

        <Input
          label={`Optional Bike End Odometer (${distanceUnit})`}
          type="number"
          step="0.1"
          placeholder={
            activeRide?.startOdometer !== undefined
              ? `Started at ${activeRide.startOdometer} ${distanceUnit}`
              : 'Leave empty to use GPS road distance'
          }
          value={endOdometer}
          onChange={(e) => setEndOdometer(e.target.value)}
          hint="Leave blank to use live GPS road KMs, or enter bike odometer for exact meter override."
        />

        <Input
          label="Ride Notes (optional)"
          placeholder="Traffic, route, or travel notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-3 border-t border-[#ECEAE2] pt-4 dark:border-[#262B27]">
          <Button type="button" variant="outline" onClick={onClose}>
            Keep Riding
          </Button>
          <Button type="submit" variant="danger" isLoading={isBusy}>
            <Square className="h-4 w-4" /> Stop Ride &amp; Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
