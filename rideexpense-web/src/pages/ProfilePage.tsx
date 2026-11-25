import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { getApiErrorMessage } from '../utils/formatters';

interface ProfileFormValues {
  name: string;
  currency: string;
  distanceUnit: 'km' | 'mi';
  fuelUnit: 'L' | 'kWh' | 'kg';
}

export function ProfilePage() {
  const { user, preferences, refreshProfile } = useAuth();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      name: user?.name ?? '',
      currency: preferences?.currency ?? 'USD',
      distanceUnit: preferences?.distanceUnit ?? 'km',
      fuelUnit: preferences?.fuelUnit ?? 'L',
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await authService.updateProfile({
        name: values.name,
        preferences: {
          currency: values.currency,
          distanceUnit: values.distanceUnit,
          fuelUnit: values.fuelUnit,
        },
      });
      await refreshProfile();
      setStatusMessage('Profile and preferences saved.');
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Failed to save profile'));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Profile &amp; Preferences
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Update your account details and measurement units.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {statusMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              {statusMessage}
            </div>
          )}
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          <Input label="Full Name" {...register('name', { required: true })} />
          <Input label="Email" value={user?.email ?? ''} disabled />

          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Currency"
              options={[
                { label: 'USD ($)', value: 'USD' },
                { label: 'INR (₹)', value: 'INR' },
                { label: 'EUR (€)', value: 'EUR' },
                { label: 'GBP (£)', value: 'GBP' },
              ]}
              {...register('currency')}
            />
            <Select
              label="Distance Unit"
              options={[
                { label: 'Kilometres (km)', value: 'km' },
                { label: 'Miles (mi)', value: 'mi' },
              ]}
              {...register('distanceUnit')}
            />
            <Select
              label="Fuel Unit"
              options={[
                { label: 'Litres (L)', value: 'L' },
                { label: 'Kilowatt-hours (kWh)', value: 'kWh' },
                { label: 'Kilograms (kg)', value: 'kg' },
              ]}
              {...register('fuelUnit')}
            />
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-5 dark:border-slate-800">
            <Button type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
