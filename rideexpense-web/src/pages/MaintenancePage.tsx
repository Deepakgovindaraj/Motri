import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { BellRing, Loader2, Plus, Trash2, Wrench } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { StatusIndicator } from '../components/ui/StatusIndicator';
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
  const [showModal, setShowModal] = useState(false);
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
      setError(getApiErrorMessage(err, 'Failed to load maintenance timeline'));
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
      setShowModal(false);
      await loadData();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to save maintenance record'));
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
          <h1 className="text-2xl font-extrabold tracking-tight text-[#171A18]">
            Maintenance Timeline
          </h1>
          <p className="mt-1 text-sm text-[#5C615A]">
            Track servicing, oil changes, tyres, insurance, and upcoming service schedules.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" /> Log Maintenance
        </Button>
      </div>

      {/* Upcoming & Overdue Reminders */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <BellRing className="h-4 w-4 text-[#171A18]" />
          <h2 className="text-base font-bold text-[#171A18]">Upcoming &amp; Scheduled Service</h2>
        </div>
        {reminders.length === 0 ? (
          <p className="text-xs text-[#7D827A]">
            No service reminders scheduled. Set a next service date or odometer target when logging maintenance.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reminders.map((rem) => (
              <div
                key={rem._id}
                className="flex items-start justify-between gap-2 rounded-[10px] border border-[#E4E2D9] bg-[#FAF9F5] p-4"
              >
                <div>
                  <p className="text-sm font-bold text-[#171A18]">
                    {rem.vehicle.vehicleName} · {rem.serviceType}
                  </p>
                  <p className="mt-1 text-xs text-[#5C615A]">
                    {rem.nextServiceDate ? `Due ${formatDate(rem.nextServiceDate)}` : ''}
                    {rem.nextServiceDate && rem.nextServiceOdometer ? ' · ' : ''}
                    {rem.nextServiceOdometer
                      ? `${formatNumber(rem.nextServiceOdometer, 0)} ${distanceUnit}`
                      : ''}
                  </p>
                </div>
                <StatusIndicator
                  tone={rem.status === 'overdue' ? 'danger' : rem.status === 'due_soon' ? 'warning' : 'positive'}
                  label={rem.status.replace('_', ' ')}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {error && (
        <div className="rounded-[12px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318]">
          {error}
        </div>
      )}

      {/* Vertical Past Service Timeline */}
      <Card className="p-6">
        <h2 className="mb-6 text-base font-bold text-[#171A18]">Past Service Records</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-[#7D827A]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading service timeline...
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center">
            <Wrench className="mx-auto h-10 w-10 text-[#A6AAA3]" />
            <h3 className="mt-3 text-base font-bold text-[#171A18]">No service records yet</h3>
            <p className="mt-1 text-sm text-[#5C615A]">
              Log your vehicle&apos;s servicing, repairs, or oil changes to build its history.
            </p>
          </div>
        ) : (
          <div className="relative space-y-6 border-l-2 border-[#E4E2D9] pl-6">
            {records.map((rec) => {
              const vehicle = rec.vehicleId as VehicleRef;
              return (
                <div key={rec._id} className="relative">
                  <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-[#171A18] bg-[#C5F467]" />
                  <div className="flex flex-col justify-between gap-3 rounded-[10px] border border-[#E4E2D9] bg-[#FAF9F5] p-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#171A18]">
                          {vehicle?.vehicleName ?? 'Vehicle'}
                        </span>
                        <Badge variant="sage">{rec.serviceType}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-[#5C615A]">
                        {formatDate(rec.serviceDate)} · Odometer: {formatNumber(rec.odometer, 0)}{' '}
                        {distanceUnit}
                        {rec.notes ? ` · ${rec.notes}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold tabular-nums text-[#171A18]">
                        {formatCurrency(
                          rec.expenseId?.amount ?? 0,
                          rec.expenseId?.currency || currency,
                        )}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => void handleDelete(rec._id)}>
                        <Trash2 className="h-4 w-4 text-[#B42318]" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Log Maintenance / Service"
        subtitle="Records a maintenance log and linked expense transaction."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div className="rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-2.5 text-sm text-[#B42318]">
              {formError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Vehicle"
              options={vehicles.map((v) => ({
                label: `${v.vehicleName} (${v.registrationNumber})`,
                value: v._id,
              }))}
              {...register('vehicleId', { required: true })}
            />
            <Select
              label="Service Category"
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
              label={`Service Cost (${currency})`}
              type="number"
              step="0.01"
              {...register('amount', { required: true, min: 0.01 })}
            />
            <Input
              label={`Odometer (${distanceUnit})`}
              type="number"
              step="0.1"
              {...register('odometer', { required: true, min: 0 })}
            />
            <Input label="Service Date" type="date" {...register('serviceDate')} />
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
          <Input label="Notes" placeholder="Workshop or parts details" {...register('notes')} />
          <div className="flex justify-end gap-3 border-t border-[#ECEAE2] pt-4">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
