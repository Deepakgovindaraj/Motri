import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { FuelType, VehiclePayload, VehicleType } from '../../types';

const vehicleFormSchema = z.object({
  vehicleName: z.string().trim().min(1, 'Vehicle name is required').max(100),
  vehicleType: z.enum(['Bike', 'Scooter', 'Car', 'Electric vehicle', 'Other']),
  registrationNumber: z
    .string()
    .trim()
    .min(2, 'Registration number is required')
    .max(30),
  brand: z.string().trim().min(1, 'Brand is required').max(60),
  model: z.string().trim().min(1, 'Model is required').max(60),
  manufacturingYear: z.coerce
    .number()
    .int()
    .min(1950, 'Enter year 1950 or later')
    .max(new Date().getFullYear() + 1, 'Invalid year'),
  fuelType: z.enum(['Petrol', 'Diesel', 'CNG', 'EV charging', 'Hybrid', 'Other']),
  tankCapacity: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  expectedMileage: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  currentOdometer: z.coerce.number().min(0, 'Odometer cannot be negative'),
  purchaseDate: z.string().optional(),
  vehicleImage: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

const VEHICLE_TYPE_OPTIONS: { label: string; value: VehicleType }[] = [
  { label: 'Bike (Motorcycle)', value: 'Bike' },
  { label: 'Scooter', value: 'Scooter' },
  { label: 'Car', value: 'Car' },
  { label: 'Electric vehicle', value: 'Electric vehicle' },
  { label: 'Other', value: 'Other' },
];

const FUEL_TYPE_OPTIONS: { label: string; value: FuelType }[] = [
  { label: 'Petrol', value: 'Petrol' },
  { label: 'Diesel', value: 'Diesel' },
  { label: 'CNG', value: 'CNG' },
  { label: 'EV charging', value: 'EV charging' },
  { label: 'Hybrid', value: 'Hybrid' },
  { label: 'Other', value: 'Other' },
];

interface VehicleFormProps {
  initialValues?: Partial<VehiclePayload>;
  submitLabel: string;
  onSubmit: (payload: VehiclePayload) => Promise<void>;
  onCancel?: () => void;
  serverError?: string | null;
}

export function VehicleForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  serverError,
}: VehicleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      vehicleName: initialValues?.vehicleName ?? '',
      vehicleType: initialValues?.vehicleType ?? 'Bike',
      registrationNumber: initialValues?.registrationNumber ?? '',
      brand: initialValues?.brand ?? '',
      model: initialValues?.model ?? '',
      manufacturingYear: initialValues?.manufacturingYear ?? new Date().getFullYear(),
      fuelType: initialValues?.fuelType ?? 'Petrol',
      tankCapacity: initialValues?.tankCapacity ?? '',
      expectedMileage: initialValues?.expectedMileage ?? '',
      currentOdometer: initialValues?.currentOdometer ?? 0,
      purchaseDate: initialValues?.purchaseDate
        ? initialValues.purchaseDate.slice(0, 10)
        : '',
      vehicleImage: initialValues?.vehicleImage ?? '',
    },
  });

  const handleFormSubmit = async (values: VehicleFormValues) => {
    const payload: VehiclePayload = {
      vehicleName: values.vehicleName,
      vehicleType: values.vehicleType,
      registrationNumber: values.registrationNumber.toUpperCase(),
      brand: values.brand,
      model: values.model,
      manufacturingYear: values.manufacturingYear,
      fuelType: values.fuelType,
      currentOdometer: values.currentOdometer,
      ...(values.tankCapacity !== '' && values.tankCapacity !== undefined
        ? { tankCapacity: Number(values.tankCapacity) }
        : {}),
      ...(values.expectedMileage !== '' && values.expectedMileage !== undefined
        ? { expectedMileage: Number(values.expectedMileage) }
        : {}),
      ...(values.purchaseDate ? { purchaseDate: values.purchaseDate } : {}),
      ...(values.vehicleImage ? { vehicleImage: values.vehicleImage } : {}),
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {serverError && (
        <div className="rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318] dark:border-[#5C2320] dark:bg-[#2B1514] dark:text-[#FCA5A5]">
          {serverError}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Vehicle Name"
          placeholder="e.g. Daily Commuter"
          error={errors.vehicleName?.message}
          {...register('vehicleName')}
        />
        <Select
          label="Vehicle Category"
          options={VEHICLE_TYPE_OPTIONS}
          error={errors.vehicleType?.message}
          {...register('vehicleType')}
        />
        <Input
          label="Registration Number"
          placeholder="e.g. MH12AB1234"
          className="uppercase"
          error={errors.registrationNumber?.message}
          {...register('registrationNumber')}
        />
        <Select
          label="Fuel / Energy Type"
          options={FUEL_TYPE_OPTIONS}
          error={errors.fuelType?.message}
          {...register('fuelType')}
        />
        <Input
          label="Brand"
          placeholder="e.g. Honda, Tata, Ather"
          error={errors.brand?.message}
          {...register('brand')}
        />
        <Input
          label="Model"
          placeholder="e.g. City, Nexon EV, 450X"
          error={errors.model?.message}
          {...register('model')}
        />
        <Input
          label="Manufacturing Year"
          type="number"
          error={errors.manufacturingYear?.message}
          {...register('manufacturingYear')}
        />
        <Input
          label="Current Odometer (km)"
          type="number"
          step="0.1"
          error={errors.currentOdometer?.message}
          {...register('currentOdometer')}
        />
        <Input
          label="Tank / Battery Capacity"
          type="number"
          step="0.1"
          placeholder="Litres or kWh"
          error={errors.tankCapacity?.message}
          {...register('tankCapacity')}
        />
        <Input
          label="Expected Mileage (km/unit)"
          type="number"
          step="0.1"
          placeholder="e.g. 18.5"
          error={errors.expectedMileage?.message}
          {...register('expectedMileage')}
        />
        <Input
          label="Purchase Date"
          type="date"
          error={errors.purchaseDate?.message}
          {...register('purchaseDate')}
        />
        <Input
          label="Vehicle Image URL (optional)"
          type="url"
          placeholder="https://..."
          error={errors.vehicleImage?.message}
          {...register('vehicleImage')}
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-[#ECEAE2] pt-5 dark:border-[#262B27]">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
