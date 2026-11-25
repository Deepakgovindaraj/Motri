import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { BellRing, Loader2, Plus, Trash2, Wrench } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { maintenanceService } from '../services/maintenanceService';
import { vehicleService } from '../services/vehicleService';
import {
  MaintenanceRecord,
  MaintenanceReminder,
  PaymentMethod,
  ServiceType,
  Vehicle,
  VehicleRef,
} from '../types';
import { formatCurrency, formatDate, formatNumber, getApiErrorMessage } from '../utils/formatters';

interface MaintenanceFormValues {
  vehicleId: string;
  serviceType: ServiceType;
  amount: number;
  serviceDate: string;
  odometer: number;
  nextServiceDate: string;
  nextServiceOdometer: string;
  paymentMethod: PaymentMethod;
  notes: string;
}

export function MaintenancePage() {
  const { preferences } = useAuth();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [reminders, setReminders] = useState<MaintenanceReminder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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
  } = useForm<MaintenanceFormValues>({
    defaultValues: {
      serviceType: 'Servicing',
      paymentMethod: 'Card',
      serviceDate: new Date().toISOString().slice(0, 10),
    },
  });

  const selectedVehicleId = watch('vehicleId');
  useEffect(() => {
    const v = vehicles.find((item) => item._id === selectedVehicleId);
    if (v) setValue('odometer', v.currentOdometer);
  }, [selectedVehicleId, vehicles, setValue]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [recRes, remRes, vehRes] = await Promise.all([
        maintenanceService.list({ limit: 50 }),
        maintenanceService.getReminders(),
        vehicleService.list({ limit: 50 }),
      ]);
      setRecords(recRes.items);
      setReminders(remRes);
      setVehicles(vehRes.items);
      if (vehRes.items.length > 0 && !selectedVehicleId) {
        setValue('vehicleId', vehRes.items[0]._id);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load maintenance data'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedVehicleId, setValue]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onSubmit = async (values: MaintenanceFormValues) => {
    setFormError(null);
    try {
      await maintenanceService.create({
        vehicleId: values.vehicleId,
        serviceType: values.serviceType,
        amount: Number(values.amount),
        serviceDate: values.serviceDate ? new Date(values.serviceDate).toISOString() : undefined,
        odometer: Number(values.odometer),
        nextServiceDate: values.nextServiceDate
          ? new Date(values.nextServiceDate).toISOString()
          : undefined,
        nextServiceOdometer: values.nextServiceOdometer
          ? Number(values.nextServiceOdometer)
          : undefined,
        paymentMethod: values.paymentMethod,
        notes: values.notes || undefined,
      });
      reset({
        vehicleId: values.vehicleId,
        serviceType: 'Servicing',
        paymentMethod: 'Card',
        serviceDate: new Date().toISOString().slice(0, 10),
      });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to record maintenance'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this maintenance record and its linked expense?')) return;
    try {
      await maintenanceService.remove(id);
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete maintenance record'));
    }
  };

  const currency = preferences?.currency ?? 'USD';
  const distanceUnit = preferences?.distanceUnit ?? 'km';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Maintenance &amp; Service
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track servicing, oil changes, tyres, insurance renewals, and upcoming reminders.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? 'Close Form' : 'Log Maintenance'}
        </Button>
      </div>

      {/* Reminders */}
      {reminders.length > 0 && (
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <BellRing className="h-4 w-4 text-electric-600" />
            Service &amp; Renewal Reminders
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reminders.map((rem) => (
              <div
                key={rem._id}
                className="rounded-lg border border-slate-200 p-3.5 text-xs dark:border-slate-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {rem.vehicle.vehicleName} · {rem.serviceType}
                  </span>
                  <Badge
                    variant={
                      rem.status === 'overdue'
                        ? 'red'
                        : rem.status === 'due_soon'
                          ? 'amber'
                          : 'neutral'
                    }
                  >
                    {rem.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="mt-1.5 text-slate-500 dark:text-slate-400">
                  {rem.nextServiceDate ? `Due ${formatDate(rem.nextServiceDate)}` : ''}
                  {rem.nextServiceDate && rem.nextServiceOdometer ? ' · ' : ''}
                  {rem.nextServiceOdometer
                    ? `Target ${formatNumber(rem.nextServiceOdometer, 0)} ${distanceUnit}`
                    : ''}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showForm && (
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Record Maintenance / Service
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
                label="Service Type"
                options={[
                  { label: 'Servicing', value: 'Servicing' },
                  { label: 'Engine oil', value: 'Engine oil' },
                  { label: 'Tyre replacement', value: 'Tyre replacement' },
                  { label: 'Battery replacement', value: 'Battery replacement' },
                  { label: 'Repairs', value: 'Repairs' },
                  { label: 'Insurance', value: 'Insurance' },
                  { label: 'Other', value: 'Other' },
                ]}
                {...register('serviceType')}
              />
              <Input
                label={`Amount (${currency})`}
                type="number"
                step="0.01"
                {...register('amount', { required: true, min: 0.01 })}
              />
              <Input label="Service Date" type="date" {...register('serviceDate')} />
              <Input
                label={`Odometer (${distanceUnit})`}
                type="number"
                step="0.1"
                {...register('odometer', { required: true, min: 0 })}
              />
              <Select
                label="Payment Method"
                options={[
                  { label: 'Card', value: 'Card' },
                  { label: 'UPI', value: 'UPI' },
                  { label: 'Cash', value: 'Cash' },
                  { label: 'Bank Transfer', value: 'Bank Transfer' },
                ]}
                {...register('paymentMethod')}
              />
              <Input label="Next Service Date (optional)" type="date" {...register('nextServiceDate')} />
              <Input
                label={`Next Service Odo (${distanceUnit})`}
                type="number"
                step="1"
                placeholder="e.g. 15000"
                {...register('nextServiceOdometer')}
              />
            </div>
            <Input label="Notes" placeholder="Parts replaced or workshop notes" {...register('notes')} />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Save Record
              </Button>
            </div>
          </form>
        </Card>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-14 text-sm text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-electric-600" />
            Loading maintenance history...
          </div>
        ) : records.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Wrench className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
              No maintenance records yet
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Keep track of servicing, oil changes, and insurance renewals.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {records.map((rec) => {
              const vehicle = rec.vehicleId as VehicleRef;
              return (
                <div
                  key={rec._id}
                  className="flex flex-col justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {vehicle?.vehicleName ?? 'Vehicle'}
                      </span>
                      <Badge variant="blue">{rec.serviceType}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(rec.serviceDate)} · Odo: {formatNumber(rec.odometer, 0)}{' '}
                      {distanceUnit}
                      {rec.notes ? ` · ${rec.notes}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {formatCurrency(rec.expenseId?.amount ?? 0, rec.expenseId?.currency || currency)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(rec._id)}
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
