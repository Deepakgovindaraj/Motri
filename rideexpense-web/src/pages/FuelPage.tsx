import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Fuel, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, TableColumn } from '../components/ui/DataTable';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { useRide } from '../context/RideContext';
import { fuelService } from '../services/fuelService';
import { vehicleService } from '../services/vehicleService';
import { FuelLog, PaymentMethod, Vehicle, VehicleRef } from '../types';
import { formatCurrency, formatDate, formatNumber, getApiErrorMessage } from '../utils/formatters';

interface FuelFormValues {
  vehicleId: string;
  fuelType: 'Petrol' | 'Diesel' | 'CNG' | 'EV charging';
  totalAmount: number;
  quantity: number;
  unitPrice: number;
  odometer: number;
  isFullTank: boolean;
  paymentMethod: PaymentMethod;
  expenseDate: string;
}

export function FuelPage() {
  const { preferences } = useAuth();
  const { lastPetrolPrice } = useRide();
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [summary, setSummary] = useState({ totalFuelCost: 0, totalQuantity: 0, averageMileage: 0 });
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [inputMode, setInputMode] = useState<'by_amount' | 'by_litres'>('by_amount');
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
      unitPrice: Number(lastPetrolPrice || 102),
      isFullTank: true,
      paymentMethod: 'UPI',
      expenseDate: new Date().toISOString().slice(0, 10),
    },
  });

  const amountPaid = Number(watch('totalAmount') || 0);
  const qty = Number(watch('quantity') || 0);
  const unitPrice = Number(watch('unitPrice') || 0);
  const calculatedLitres =
    amountPaid > 0 && unitPrice > 0 ? Number((amountPaid / unitPrice).toFixed(2)) : 0;
  const calculatedCost = Number((qty * unitPrice).toFixed(2));
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
      setError(getApiErrorMessage(err, 'Failed to load fuel analytics'));
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
        ...(inputMode === 'by_amount'
          ? { totalAmount: Number(values.totalAmount) }
          : { quantity: Number(values.quantity) }),
        unitPrice: Number(values.unitPrice),
        odometer: Number(values.odometer),
        isFullTank: Boolean(values.isFullTank),
        paymentMethod: values.paymentMethod,
        expenseDate: values.expenseDate ? new Date(values.expenseDate).toISOString() : undefined,
      });
      localStorage.setItem('vehixa_last_petrol_price', String(values.unitPrice));
      reset({
        vehicleId: values.vehicleId,
        fuelType: values.fuelType,
        unitPrice: Number(values.unitPrice),
        isFullTank: true,
        paymentMethod: 'UPI',
        expenseDate: new Date().toISOString().slice(0, 10),
      });
      setShowModal(false);
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

  const trendData = [...logs]
    .reverse()
    .map((l) => ({
      date: formatDate(l.expenseId?.expenseDate || l.createdAt),
      cost: l.expenseId?.amount ?? 0,
      quantity: l.quantity,
    }));

  const columns: TableColumn<FuelLog>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (log) => (
        <span className="text-xs text-[#5C615A]">
          {formatDate(log.expenseId?.expenseDate || log.createdAt)}
        </span>
      ),
    },
    {
      key: 'vehicle',
      header: 'Bike / Vehicle',
      render: (log) => (
        <div>
          <p className="font-semibold text-[#171A18]">
            {(log.vehicleId as VehicleRef)?.vehicleName ?? 'Vehicle'}
          </p>
          <p className="text-xs text-[#7D827A]">{log.fuelType}</p>
        </div>
      ),
    },
    {
      key: 'qty',
      header: 'Litres & Price',
      render: (log) => (
        <span className="text-xs tabular-nums text-[#171A18]">
          {log.quantity} {fuelUnit} @ {formatCurrency(log.unitPrice, currency)}/{fuelUnit}
        </span>
      ),
    },
    {
      key: 'odo',
      header: 'Odometer',
      render: (log) => (
        <span className="text-xs tabular-nums text-[#5C615A]">
          {formatNumber(log.odometer, 0)} {distanceUnit}
        </span>
      ),
    },
    {
      key: 'mileage',
      header: 'Tank / Mileage',
      render: (log) => (
        <div className="flex items-center gap-2">
          <Badge variant={log.isFullTank ? 'sage' : 'neutral'}>
            {log.isFullTank ? 'Full' : 'Partial'}
          </Badge>
          {log.mileageKmPerUnit && (
            <Badge variant="lime">
              {log.mileageKmPerUnit} {distanceUnit}/{fuelUnit}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'cost',
      header: 'Amount Paid',
      align: 'right',
      render: (log) => (
        <span className="font-bold text-[#171A18]">
          {formatCurrency(log.expenseId?.amount ?? 0, log.expenseId?.currency || currency)}
        </span>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (log) => (
        <Button variant="ghost" size="sm" onClick={() => void handleDelete(log._id)}>
          <Trash2 className="h-4 w-4 text-[#B42318]" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#171A18]">
            Petrol &amp; Fuel Analytics
          </h1>
          <p className="mt-1 text-sm text-[#5C615A]">
            Enter petrol amount paid &amp; price per litre — litres and bike mileage calculate automatically.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            options={[
              { label: 'All Vehicles', value: '' },
              ...vehicles.map((v) => ({ label: v.vehicleName, value: v._id })),
            ]}
          />
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Fill Petrol
          </Button>
        </div>
      </div>

      {/* Fuel Summary & Trend Split */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card variant="dark" className="flex flex-col justify-between p-6 sm:p-7 lg:col-span-5">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.09em] text-[#C5F467]">
              Full-Tank Average Mileage
            </span>
            <p className="mt-3 text-4xl font-extrabold tabular-nums text-white">
              {summary.averageMileage > 0
                ? `${formatNumber(summary.averageMileage, 2)} ${distanceUnit}/${fuelUnit}`
                : 'Need 2 full tanks'}
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-[#2B302C] pt-5">
            <div>
              <p className="text-xs text-[#A6AAA3]">Total Petrol Spend</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-white">
                {formatCurrency(summary.totalFuelCost, currency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#A6AAA3]">Total Litres</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-[#C5F467]">
                {formatNumber(summary.totalQuantity, 2)} {fuelUnit}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-7">
          <h2 className="mb-4 text-base font-bold text-[#171A18]">Fuel Spend Trend</h2>
          <div className="h-52 w-full">
            {trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#7D827A]">
                Log petrol entries to plot fuel trends.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E2D9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5C615A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#5C615A' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(val: number) => formatCurrency(val, currency)} />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="#171A18"
                    strokeWidth={2}
                    fill="#DCE8D0"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {error && (
        <div className="rounded-[12px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318]">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-sm text-[#7D827A]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading petrol logs...
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={logs}
            keyExtractor={(l) => l._id}
            emptyState={
              <div className="px-6 py-14 text-center">
                <Fuel className="mx-auto h-10 w-10 text-[#A6AAA3]" />
                <h3 className="mt-3 text-base font-bold text-[#171A18]">No fuel purchases yet</h3>
                <p className="mt-1 text-sm text-[#5C615A]">
                  Record your petrol fill-ups to track litres and calculate bike mileage.
                </p>
              </div>
            }
          />
        )}
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Log Petrol / Fuel Fill-Up"
        subtitle="Enter amount paid and price/litre to auto-calculate litres filled."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div className="rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-2.5 text-sm text-[#B42318]">
              {formError}
            </div>
          )}

          {/* Mode Toggle */}
          <div className="inline-flex rounded-[10px] border border-[#E4E2D9] bg-[#F4F3ED] p-1">
            <button
              type="button"
              onClick={() => setInputMode('by_amount')}
              className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
                inputMode === 'by_amount'
                  ? 'bg-[#171A18] text-[#C5F467]'
                  : 'text-[#5C615A]'
              }`}
            >
              By Amount Paid (₹ → Litres)
            </button>
            <button
              type="button"
              onClick={() => setInputMode('by_litres')}
              className={`rounded-[8px] px-3 py-1.5 text-xs font-semibold ${
                inputMode === 'by_litres'
                  ? 'bg-[#171A18] text-[#C5F467]'
                  : 'text-[#5C615A]'
              }`}
            >
              By Litres (L → Amount)
            </button>
          </div>

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
              label="Fuel Type"
              options={[
                { label: 'Petrol', value: 'Petrol' },
                { label: 'Diesel', value: 'Diesel' },
                { label: 'CNG', value: 'CNG' },
                { label: 'EV charging', value: 'EV charging' },
              ]}
              {...register('fuelType')}
            />
            {inputMode === 'by_amount' ? (
              <Input
                label={`Amount Paid (${currency})`}
                type="number"
                step="0.01"
                placeholder="e.g. 500"
                {...register('totalAmount', { required: inputMode === 'by_amount', min: 1 })}
              />
            ) : (
              <Input
                label={`Quantity (${fuelUnit})`}
                type="number"
                step="0.01"
                placeholder="e.g. 4.88"
                {...register('quantity', { required: inputMode === 'by_litres', min: 0.01 })}
              />
            )}
            <Input
              label={`Price per ${fuelUnit} (${currency})`}
              type="number"
              step="0.01"
              {...register('unitPrice', { required: true, min: 0.01 })}
            />
            <Input
              label={`Odometer (${distanceUnit})`}
              type="number"
              step="0.1"
              {...register('odometer', { required: true, min: 0 })}
            />
            <Input label="Date" type="date" {...register('expenseDate')} />
            <Select
              label="Payment Method"
              options={[
                { label: 'UPI', value: 'UPI' },
                { label: 'Cash', value: 'Cash' },
                { label: 'Card', value: 'Card' },
                { label: 'Wallet', value: 'Wallet' },
              ]}
              {...register('paymentMethod')}
            />
            <div className="flex items-center gap-2.5 pt-6">
              <input
                id="isFullTank"
                type="checkbox"
                className="h-4 w-4 rounded border-[#DCDAD0] accent-[#171A18]"
                {...register('isFullTank')}
              />
              <label htmlFor="isFullTank" className="text-sm font-medium text-[#171A18]">
                Full tank fill-up
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-[10px] bg-[#171A18] px-4 py-3 text-white">
            <span className="text-xs text-[#A6AAA3]">
              {inputMode === 'by_amount' ? 'Calculated Litres' : 'Calculated Fuel Cost'}
            </span>
            <strong className="text-base tabular-nums text-[#C5F467]">
              {inputMode === 'by_amount'
                ? `${calculatedLitres} ${fuelUnit}`
                : formatCurrency(calculatedCost, currency)}
            </strong>
          </div>

          <div className="flex justify-end gap-3 border-t border-[#ECEAE2] pt-4">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Fuel Log
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
