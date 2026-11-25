import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AlertTriangle, Loader2, PiggyBank, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { budgetService } from '../services/budgetService';
import { expenseService } from '../services/expenseService';
import { vehicleService } from '../services/vehicleService';
import { BudgetProgress, ExpenseCategory, Vehicle } from '../types';
import { formatCurrency, formatDate, getApiErrorMessage } from '../utils/formatters';

interface BudgetFormValues {
  period: 'monthly' | 'weekly' | 'annual' | 'custom';
  amount: number;
  vehicleId: string;
  categoryId: string;
  startDate: string;
  endDate: string;
}

function getDefaultDates(period: 'monthly' | 'weekly' | 'annual' | 'custom') {
  const now = new Date();
  if (period === 'weekly') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
  }
  if (period === 'annual') {
    return {
      startDate: `${now.getFullYear()}-01-01`,
      endDate: `${now.getFullYear()}-12-31`,
    };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

export function BudgetsPage() {
  const { preferences } = useAuth();
  const [budgets, setBudgets] = useState<BudgetProgress[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const initialDates = getDefaultDates('monthly');
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<BudgetFormValues>({
    defaultValues: {
      period: 'monthly',
      vehicleId: '',
      categoryId: '',
      ...initialDates,
    },
  });

  const period = watch('period');
  useEffect(() => {
    if (period !== 'custom') {
      const dates = getDefaultDates(period);
      setValue('startDate', dates.startDate);
      setValue('endDate', dates.endDate);
    }
  }, [period, setValue]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [progRes, vehRes, catRes] = await Promise.all([
        budgetService.getProgress(),
        vehicleService.list({ limit: 50 }),
        expenseService.getCategories(),
      ]);
      setBudgets(progRes);
      setVehicles(vehRes.items);
      setCategories(catRes);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load budgets'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onSubmit = async (values: BudgetFormValues) => {
    setFormError(null);
    try {
      await budgetService.create({
        period: values.period,
        amount: Number(values.amount),
        vehicleId: values.vehicleId || undefined,
        categoryId: values.categoryId || undefined,
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(`${values.endDate}T23:59:59`).toISOString(),
      });
      reset({
        period: 'monthly',
        vehicleId: '',
        categoryId: '',
        ...getDefaultDates('monthly'),
      });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to create budget'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this budget?')) return;
    try {
      await budgetService.remove(id);
      setBudgets((prev) => prev.filter((b) => b._id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete budget'));
    }
  };

  const currency = preferences?.currency ?? 'USD';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Budgets &amp; Threshold Alerts
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Configure monthly, fuel, vehicle, or category budgets with alerts at 75%, 90%, and 100%.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? 'Close Form' : 'New Budget'}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Create Budget
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                {formError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Period"
                options={[
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Weekly', value: 'weekly' },
                  { label: 'Annual', value: 'annual' },
                  { label: 'Custom Range', value: 'custom' },
                ]}
                {...register('period')}
              />
              <Input
                label={`Total Budget (${currency})`}
                type="number"
                step="0.01"
                placeholder="e.g. 500"
                {...register('amount', { required: true, min: 1 })}
              />
              <Select
                label="Vehicle Scope (optional)"
                options={[
                  { label: 'All Vehicles', value: '' },
                  ...vehicles.map((v) => ({ label: v.vehicleName, value: v._id })),
                ]}
                {...register('vehicleId')}
              />
              <Select
                label="Category Scope (optional)"
                options={[
                  { label: 'All Categories', value: '' },
                  ...categories.map((c) => ({ label: c.name, value: c._id })),
                ]}
                {...register('categoryId')}
              />
              <Input label="Start Date" type="date" {...register('startDate', { required: true })} />
              <Input label="End Date" type="date" {...register('endDate', { required: true })} />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Save Budget
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

      {isLoading ? (
        <Card className="flex items-center justify-center py-16 text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-electric-600" />
          Evaluating budgets...
        </Card>
      ) : budgets.length === 0 ? (
        <Card className="px-6 py-16 text-center">
          <PiggyBank className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
            No budgets created yet
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Set a monthly, fuel, or vehicle spending limit to track utilization.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {budgets.map((b) => {
            const barColor =
              b.alertLevel === 'exceeded_100'
                ? 'bg-red-600'
                : b.alertLevel === 'critical_90'
                  ? 'bg-orange-500'
                  : b.alertLevel === 'warning_75'
                    ? 'bg-amber-500'
                    : 'bg-electric-600';

            const badgeVariant =
              b.alertLevel === 'exceeded_100'
                ? 'red'
                : b.alertLevel === 'critical_90' || b.alertLevel === 'warning_75'
                  ? 'amber'
                  : 'green';

            return (
              <Card key={b._id} className="p-6">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        {b.vehicle?.vehicleName || 'All Vehicles'} ·{' '}
                        {b.category?.name || 'All Categories'}
                      </h3>
                      <Badge variant={badgeVariant}>
                        {b.triggeredThreshold ? `${b.triggeredThreshold}% Alert` : 'On Track'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {b.period.toUpperCase()} · {formatDate(b.startDate)} – {formatDate(b.endDate)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(b._id)}
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-600 dark:text-slate-300">
                      Spent: {formatCurrency(b.amountSpent, currency)}
                    </span>
                    <span className="text-slate-900 dark:text-white">
                      {b.spendingPercentage}% of {formatCurrency(b.totalBudget, currency)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-navy-800">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${Math.min(100, b.spendingPercentage)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Remaining:{' '}
                      <strong
                        className={
                          b.remainingBudget < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-900 dark:text-white'
                        }
                      >
                        {formatCurrency(b.remainingBudget, currency)}
                      </strong>
                    </span>
                    {b.triggeredThreshold && (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Threshold {b.triggeredThreshold}% crossed
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
