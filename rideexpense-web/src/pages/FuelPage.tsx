import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Fuel, Gauge, Loader2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { fuelService } from '../services/fuelService';
import { vehicleService } from '../services/vehicleService';
import { FuelLog, PaymentMethod, Vehicle, VehicleRef } from '../types';
import { formatCurrency, formatDate, formatNumber, getApiErrorMessage } from '../utils/formatters';

interface FuelFormValues {
  vehicleId: string;
  fuelType: 'Petrol' | 'Diesel' | 'CNG' | 'EV charging';
  quantity: number;
  unitPrice: number;
  odometer: number;
  isFullTank: boolean;
  paymentMethod: PaymentMethod;
  expenseDate: string;
}

export function FuelPage() {
  const { preferences } = useAuth();
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [summary, setSummary] = useState({ totalFuelCost: 0, totalQuantity: 0, averageMileage: 0 });
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<FuelFormValues>({
    defaultValues: {
      fuelType: 'Petrol',
      isFullTank: true,
      paymentMethod: 'Card',
      expenseDate: new Date().toISOString().slice(0, 10),
    },
  });

  const qty = Number(watch('quantity') || 0);
  const unitPrice = Number(watch('unitPrice') || 0);
  const totalCost = Number((qty * unitPrice).toFixed(2));
  const selectedVehicleId = watch('vehicleId');

  useEffect(() => {
    const v = vehicles.find((item) => item._id === selectedVehicleId);
    if (v) {
      setValue('odometer', v.currentOdometer);
      if (
        v.fuelType === 'Petrol' ||
        v.fuelType === 'Diesel' ||
        v.fuelType === 'CNG' ||
        v.fuelType === 'EV charging'
      ) {
        setValue('fuelType', v.fuelType);
      }
    }
  }, [selectedVehicleId, vehicles, setValue]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fuelRes, vehRes] = await Promise.all([
        fuelService.list({ vehicleId: vehicleFilter || undefined, limit: 50 }),
        vehicleService.list({ limit: 50 }),
      ]);
      setLogs(fuelRes.items);
      setSummary(fuelRes.summary);
      setVehicles(vehRes.items);
      if (vehRes.items.length > 0 && !selectedVehicleId) {
        setValue('vehicleId', vehRes.items[0]._id);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load fuel logs'));
    } finally {
      setIsLoading(false);
    }
  }, [vehicleFilter, selectedVehicleId, setValue]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onSubmit = async (values: FuelFormValues) => {
    setFormError(null);
    try {
      await fuelService.create({
        vehicleId: values.vehicleId,
        fuelType: values.fuelType,
        quantity: Number(values.quantity),
        unitPrice: Number(values.unitPrice),
        odometer: Number(values.odometer),
        isFullTank: Boolean(values.isFullTank),
        paymentMethod: values.paymentMethod,
        expenseDate: values.expenseDate ? new Date(values.expenseDate).toISOString() : undefined,
      });
      reset({
        vehicleId: values.vehicleId,
        fuelType: values.fuelType,
        isFullTank: true,
        paymentMethod: 'Card',
        expenseDate: new Date().toISOString().slice(0, 10),
      });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to save fuel log'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this fuel log and its linked expense entry?')) return;
    try {
      await fuelService.remove(id);
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete fuel log'));
    }
  };

  const currency = preferences?.currency ?? 'USD';
  const distanceUnit = preferences?.distanceUnit ?? 'km';
  const fuelUnit = preferences?.fuelUnit ?? 'L';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Fuel &amp; EV Charging
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track fill-ups, unit costs, and full-tank-to-full-tank mileage calculations.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? 'Close Form' : 'Log Fill-Up'}
        </Button>
      </div>

      {/* Live Fuel Summary */}
      <div className="grid gap-5 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Fuel Spend
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(summary.totalFuelCost, currency)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Volume / Energy
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {formatNumber(summary.totalQuantity, 2)} {fuelUnit}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Full-Tank Avg Mileage
            </p>
            <Gauge className="h-4 w-4 text-electric-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-electric-600 dark:text-blue-400">
            {summary.averageMileage > 0
              ? `${formatNumber(summary.averageMileage, 2)} ${distanceUnit}/${fuelUnit}`
              : 'Need 2 full tanks'}
          </p>
        </Card>
      </div>

      {showForm && (
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Log Fuel / Charging Entry
          </h2>
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
              <Select
                label="Fuel Type"
                options={[
                  { label: 'Petrol', value: 'Petrol' },
                  { label: 'Diesel', value: 'Diesel' },
                  { label: 'CNG', value: 'CNG' },
                  { label: 'EV charging', value: 'EV charging' },
                ]}
                {...register('fuelType')}
              />
              <Input
                label={`Odometer (${distanceUnit})`}
                type="number"
                step="0.1"
                {...register('odometer', { required: true, min: 0 })}
              />
              <Input
                label={`Quantity (${fuelUnit})`}
                type="number"
                step="0.01"
                {...register('quantity', { required: true, min: 0.01 })}
              />
              <Input
                label={`Unit Price (${currency})`}
                type="number"
                step="0.01"
                {...register('unitPrice', { required: true, min: 0.01 })}
              />
              <div className="flex flex-col justify-end">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-navy-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total Cost: </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(totalCost, currency)}
                  </span>
                </div>
              </div>
              <Select
                label="Payment Method"
                options={[
                  { label: 'Card', value: 'Card' },
                  { label: 'UPI', value: 'UPI' },
                  { label: 'Cash', value: 'Cash' },
                  { label: 'Wallet', value: 'Wallet' },
                ]}
                {...register('paymentMethod')}
              />
              <Input label="Date" type="date" {...register('expenseDate')} />
              <div className="flex items-center gap-2.5 pt-6">
                <input
                  id="isFullTank"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-electric-600 focus:ring-electric-500"
                  {...register('isFullTank')}
                />
                <label htmlFor="isFullTank" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Full tank fill-up
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Save Fuel Log
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-4">
        <Select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          options={[
            { label: 'Filter by Vehicle: All', value: '' },
            ...vehicles.map((v) => ({ label: v.vehicleName, value: v._id })),
          ]}
        />
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
            Loading fuel logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Fuel className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
              No fuel logs yet
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Log two full-tank fill-ups to start seeing automatic mileage calculations.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {logs.map((log) => {
              const vehicle = log.vehicleId as VehicleRef;
              return (
                <div
                  key={log._id}
                  className="flex flex-col justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {vehicle?.vehicleName ?? 'Vehicle'} · {log.fuelType}
                      </span>
                      <Badge variant={log.isFullTank ? 'green' : 'amber'}>
                        {log.isFullTank ? 'Full Tank' : 'Partial'}
                      </Badge>
                      {log.mileageKmPerUnit && (
                        <Badge variant="blue">
                          {log.mileageKmPerUnit} {distanceUnit}/{fuelUnit}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {log.quantity} {fuelUnit} @ {formatCurrency(log.unitPrice, currency)} · Odo:{' '}
                      {formatNumber(log.odometer, 0)} {distanceUnit} ·{' '}
                      {formatDate(log.expenseId?.expenseDate || log.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(log.expenseId?.amount ?? 0, log.expenseId?.currency || currency)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(log._id)}
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
