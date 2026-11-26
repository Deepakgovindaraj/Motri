import { useEffect, useState } from 'react';
import { MapPin, Navigation, Square } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useRide } from '../context/RideContext';
import { formatNumber, getApiErrorMessage } from '../utils/formatters';
import { detectCurrentPosition } from '../utils/location';

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
  const [endOdometer, setEndOdometer] = useState('');
  const [notes, setNotes] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !activeRide) return;
    setError(null);
    setEndOdometer('');
    setNotes('');

    let active = true;
    setDetecting(true);
    detectCurrentPosition()
      .then((pos) => {
        if (active) setEndLocation(pos.label);
      })
      .catch(() => {
        // Fallback handled on submit
      })
      .finally(() => {
        if (active) setDetecting(false);
      });

    return () => {
      active = false;
    };
  }, [open, activeRide]);

  const distanceUnit = preferences?.distanceUnit ?? 'km';

  const handleStop = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await stopRide({
        endLocation: endLocation || undefined,
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
      subtitle="Confirm your destination to calculate KMs driven, bike mileage, and fuel cost."
    >
      <form onSubmit={handleStop} className="space-y-4">
        {error && (
          <div className="rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-2.5 text-sm text-[#B42318] dark:border-[#5C2320] dark:bg-[#2B1514] dark:text-[#FCA5A5]">
            {error}
          </div>
        )}

        <div className="rounded-[10px] border border-[#262A27] bg-[#171A18] px-4 py-3 text-white dark:border-[#323833] dark:bg-[#121513]">
          <p className="text-xs text-[#A6AAA3]">GPS Tracked Distance</p>
          <p className="mt-0.5 text-2xl font-extrabold tabular-nums text-[#C5F467]">
            {formatNumber(liveDistanceKm, 2)} {distanceUnit}
          </p>
        </div>

        <div className="rounded-[10px] border border-[#E4E2D9] bg-[#FAF9F5] p-3.5 dark:border-[#2B302C] dark:bg-[#1E221F]">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#5C615A] dark:text-[#B0B4AD]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#171A18] dark:text-[#C5F467]" />
              Destination Location
            </span>
            {detecting && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#7D827A] dark:text-[#8E938B]">
                <Navigation className="h-3 w-3 animate-pulse" /> Detecting...
              </span>
            )}
          </div>
          <input
            type="text"
            value={endLocation}
            onChange={(e) => setEndLocation(e.target.value)}
            placeholder="Detected destination or enter place name"
            className="w-full rounded-[8px] border border-[#DCDAD0] bg-white px-3 py-2 text-sm text-[#171A18] placeholder-[#A6AAA3] focus:border-[#171A18] focus:outline-none dark:border-[#343A35] dark:bg-[#171A18] dark:text-[#F4F3ED] dark:placeholder-[#7D827A] dark:focus:border-[#C5F467]"
          />
        </div>

        <Input
          label={`Optional Bike End Odometer (${distanceUnit})`}
          type="number"
          step="0.1"
          placeholder={
            activeRide?.startOdometer !== undefined
              ? `Started at ${activeRide.startOdometer} ${distanceUnit}`
              : 'Leave empty to use GPS distance'
          }
          value={endOdometer}
          onChange={(e) => setEndOdometer(e.target.value)}
          hint="Leave blank to use live GPS KMs, or enter bike odometer if indoors."
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
