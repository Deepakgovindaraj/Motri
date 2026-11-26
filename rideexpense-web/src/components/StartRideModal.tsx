import { useEffect, useState } from 'react';
import { Fuel, MapPin, Navigation, Play } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';
import { useAuth } from '../context/AuthContext';
import { useRide } from '../context/RideContext';
import { PaymentMethod, Vehicle } from '../types';
import { formatCurrency, getApiErrorMessage } from '../utils/formatters';
import { detectCurrentPosition } from '../utils/location';

export function StartRideModal({
  open,
  onClose,
  vehicles,
  defaultVehicleId,
  onStarted,
}: {
  open: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  defaultVehicleId?: string;
  onStarted?: () => void;
}) {
  const { preferences } = useAuth();
  const { startRide, lastPetrolPrice, isBusy } = useRide();

  const [vehicleId, setVehicleId] = useState('');
  const [purpose, setPurpose] = useState('Travel');
  const [startLocation, setStartLocation] = useState('');
  const [detectingLoc, setDetectingLoc] = useState(false);

  const [filledPetrol, setFilledPetrol] = useState(false);
  const [petrolAmount, setPetrolAmount] = useState('');
  const [petrolPrice, setPetrolPrice] = useState(lastPetrolPrice || '102');
  const [odometer, setOdometer] = useState('');
  const [isFullTank, setIsFullTank] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const selected =
      vehicles.find((v) => v._id === (defaultVehicleId || vehicleId)) ?? vehicles[0];
    if (selected) {
      setVehicleId(selected._id);
      setOdometer(String(selected.currentOdometer));
    }
    setPetrolPrice(lastPetrolPrice || '102');
    setError(null);

    let active = true;
    setDetectingLoc(true);
    detectCurrentPosition()
      .then((pos) => {
        if (active) setStartLocation(pos.label);
      })
      .catch(() => {
        // User can still start ride or type start location manually
      })
      .finally(() => {
        if (active) setDetectingLoc(false);
      });

    return () => {
      active = false;
    };
  }, [open, defaultVehicleId, vehicles, lastPetrolPrice, vehicleId]);

  const amountNum = Number(petrolAmount || 0);
  const priceNum = Number(petrolPrice || 0);
  const calculatedLitres =
    amountNum > 0 && priceNum > 0 ? Number((amountNum / priceNum).toFixed(2)) : 0;

  const currency = preferences?.currency ?? 'INR';
  const distanceUnit = preferences?.distanceUnit ?? 'km';
  const fuelUnit = preferences?.fuelUnit ?? 'L';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!vehicleId) {
      setError('Please select a bike or vehicle first.');
      return;
    }

    if (filledPetrol) {
      if (amountNum <= 0 || priceNum <= 0) {
        setError('Enter both petrol amount paid and petrol price per litre.');
        return;
      }
    }

    try {
      await startRide({
        vehicleId,
        purpose,
        startLocation: startLocation || undefined,
        ...(filledPetrol
          ? {
              preRideFuel: {
                fuelType: 'Petrol',
                totalAmount: amountNum,
                unitPrice: priceNum,
                odometer: Number(odometer || 0),
                isFullTank,
                paymentMethod,
              },
            }
          : {}),
      });
      onClose();
      onStarted?.();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not start ride.'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start Bike Ride"
      subtitle="Optionally log petrol filled before riding, detect your current location, and track until destination."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-2.5 text-sm text-[#B42318] dark:border-[#5C2320] dark:bg-[#2B1514] dark:text-[#FCA5A5]">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Select Bike / Vehicle"
            value={vehicleId}
            onChange={(e) => {
              setVehicleId(e.target.value);
              const found = vehicles.find((v) => v._id === e.target.value);
              if (found) setOdometer(String(found.currentOdometer));
            }}
            options={vehicles.map((v) => ({
              label: `${v.vehicleName} (${v.registrationNumber})`,
              value: v._id,
            }))}
          />
          <Select
            label="Ride Purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            options={[
              { label: 'Travel / Touring', value: 'Travel' },
              { label: 'Commute', value: 'Commute' },
              { label: 'Road Trip', value: 'Road Trip' },
              { label: 'Errand', value: 'Errand' },
              { label: 'Delivery', value: 'Delivery' },
            ]}
          />
        </div>

        {/* Auto-detected Starting Location */}
        <div className="rounded-[10px] border border-[#E4E2D9] bg-[#FAF9F5] p-3.5 dark:border-[#2B302C] dark:bg-[#1E221F]">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#5C615A] dark:text-[#B0B4AD]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#171A18] dark:text-[#C5F467]" />
              Current Starting Location
            </span>
            {detectingLoc && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#7D827A] dark:text-[#8E938B]">
                <Navigation className="h-3 w-3 animate-pulse" /> Detecting GPS...
              </span>
            )}
          </div>
          <input
            type="text"
            value={startLocation}
            onChange={(e) => setStartLocation(e.target.value)}
            placeholder="Detecting location or type starting point..."
            className="w-full rounded-[8px] border border-[#DCDAD0] bg-white px-3 py-2 text-sm text-[#171A18] placeholder-[#A6AAA3] focus:border-[#171A18] focus:outline-none dark:border-[#343A35] dark:bg-[#171A18] dark:text-[#F4F3ED] dark:placeholder-[#7D827A] dark:focus:border-[#C5F467]"
          />
        </div>

        {/* Optional Pre-Ride Petrol Input */}
        <div className="rounded-[12px] border border-[#E4E2D9] bg-white p-4 dark:border-[#2B302C] dark:bg-[#1E221F]">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#DCE8D0] text-[#171A18] dark:bg-[#1E2E18] dark:text-[#C5F467]">
                <Fuel className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-[#171A18] dark:text-[#F4F3ED]">Filled petrol before this ride?</p>
                <p className="text-xs text-[#7D827A] dark:text-[#8E938B]">
                  Enter petrol amount &amp; price/L — litres are calculated automatically
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={filledPetrol}
              onChange={(e) => setFilledPetrol(e.target.checked)}
              className="h-4 w-4 accent-[#171A18] dark:accent-[#C5F467]"
            />
          </label>

          {filledPetrol && (
            <div className="mt-4 space-y-4 border-t border-[#ECEAE2] pt-4 dark:border-[#2B302C]">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label={`Petrol Amount Paid (${currency})`}
                  type="number"
                  step="0.01"
                  placeholder="e.g. 500"
                  value={petrolAmount}
                  onChange={(e) => setPetrolAmount(e.target.value)}
                />
                <Input
                  label={`Petrol Price per ${fuelUnit} (${currency})`}
                  type="number"
                  step="0.01"
                  placeholder="e.g. 102.50"
                  value={petrolPrice}
                  onChange={(e) => setPetrolPrice(e.target.value)}
                />
                <Input
                  label={`Current Odometer (${distanceUnit})`}
                  type="number"
                  step="0.1"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                />
                <Select
                  label="Payment Method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  options={[
                    { label: 'UPI', value: 'UPI' },
                    { label: 'Cash', value: 'Cash' },
                    { label: 'Card', value: 'Card' },
                    { label: 'Wallet', value: 'Wallet' },
                  ]}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-[#171A18] px-4 py-3 text-white">
                <span className="text-xs text-[#A6AAA3]">
                  {amountNum > 0 ? formatCurrency(amountNum, currency) : 'Amount'} ÷{' '}
                  {priceNum > 0 ? formatCurrency(priceNum, currency) : 'Price'} =
                </span>
                <span className="text-base font-extrabold tabular-nums text-[#C5F467]">
                  {calculatedLitres} {fuelUnit} Petrol
                </span>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-[#5C615A] dark:text-[#B0B4AD]">
                <input
                  type="checkbox"
                  checked={isFullTank}
                  onChange={(e) => setIsFullTank(e.target.checked)}
                  className="h-4 w-4 accent-[#171A18] dark:accent-[#C5F467]"
                />
                Mark as full tank (for exact full-tank-to-full-tank mileage calculation)
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#ECEAE2] pt-4 dark:border-[#262B27]">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isBusy}>
            <Play className="h-4 w-4" /> Start Ride Now
          </Button>
        </div>
      </form>
    </Modal>
  );
}
