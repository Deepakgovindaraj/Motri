import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Plus, Receipt, Search, Trash2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';
import { expenseService } from '../services/expenseService';
import { vehicleService } from '../services/vehicleService';
import { Expense, ExpenseCategory, PaymentMethod, Vehicle, VehicleRef } from '../types';
import { formatCurrency, formatDate, getApiErrorMessage } from '../utils/formatters';

interface ExpenseFormValues {
  vehicleId: string;
  categoryId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  expenseDate: string;
  description: string;
  attachmentUrl: string;
}

export function ExpensesPage() {
  const { preferences } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState<'expenseDate' | 'amount'>('expenseDate');

  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<ExpenseFormValues>({
    defaultValues: {
      paymentMethod: 'Card',
      expenseDate: new Date().toISOString().slice(0, 10),
    },
  });

  useEffect(() => {
    async function loadMeta() {
      try {
        const [cats, vehs] = await Promise.all([
          expenseService.getCategories(),
          vehicleService.list({ limit: 50 }),
        ]);
        setCategories(cats);
        setVehicles(vehs.items);
        if (cats.length > 0) setValue('categoryId', cats[0]._id);
        if (vehs.items.length > 0) setValue('vehicleId', vehs.items[0]._id);
      } catch {
        // Handled by main loader
      }
    }
    void loadMeta();
  }, [setValue]);

  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await expenseService.list({
        q: searchQuery || undefined,
        vehicleId: vehicleFilter || undefined,
        categoryId: categoryFilter || undefined,
        sortBy,
        sortOrder: 'desc',
        page,
        limit: 15,
      });
      setExpenses(res.items);
      setTotalAmount(res.totalAmount);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load expenses'));
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, vehicleFilter, categoryFilter, sortBy, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadExpenses();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadExpenses]);

  const onSubmit = async (values: ExpenseFormValues) => {
    setFormError(null);
    try {
      await expenseService.create({
        vehicleId: values.vehicleId,
        categoryId: values.categoryId,
        amount: Number(values.amount),
        paymentMethod: values.paymentMethod,
        expenseDate: values.expenseDate ? new Date(values.expenseDate).toISOString() : undefined,
        description: values.description || undefined,
        attachmentUrl: values.attachmentUrl || undefined,
      });
      reset({
        vehicleId: values.vehicleId,
        categoryId: values.categoryId,
        paymentMethod: 'Card',
        expenseDate: new Date().toISOString().slice(0, 10),
      });
      setShowForm(false);
      setPage(1);
      await loadExpenses();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to record expense'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this expense record (and any linked fuel/maintenance entry)?')) {
      return;
    }
    try {
      await expenseService.remove(id);
      await loadExpenses();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete expense'));
    }
  };

  const currency = preferences?.currency ?? 'USD';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Expenses
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Unified financial ledger across all 12 vehicle expense categories.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-800 dark:bg-navy-900">
            <span className="text-slate-500 dark:text-slate-400">Filtered Total: </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {formatCurrency(totalAmount, currency)}
            </span>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            {showForm ? 'Close' : 'Add Expense'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Record Vehicle Expense
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
                label="Category"
                options={categories.map((c) => ({ label: c.name, value: c._id }))}
                {...register('categoryId', { required: true })}
              />
              <Input
                label={`Amount (${currency})`}
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register('amount', { required: true, min: 0.01 })}
              />
              <Select
                label="Payment Method"
                options={[
                  { label: 'Card', value: 'Card' },
                  { label: 'UPI', value: 'UPI' },
                  { label: 'Cash', value: 'Cash' },
                  { label: 'Bank Transfer', value: 'Bank Transfer' },
                  { label: 'Wallet', value: 'Wallet' },
                  { label: 'Other', value: 'Other' },
                ]}
                {...register('paymentMethod')}
              />
              <Input label="Date" type="date" {...register('expenseDate')} />
              <Input
                label="Receipt URL (optional)"
                type="url"
                placeholder="https://..."
                {...register('attachmentUrl')}
              />
            </div>
            <Input label="Description" placeholder="e.g. Fastag toll recharge" {...register('description')} />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Save Expense
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search description..."
              className="block w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-electric-600 focus:outline-none dark:border-slate-700 dark:bg-navy-950 dark:text-slate-100"
            />
          </div>
          <Select
            value={vehicleFilter}
            onChange={(e) => {
              setVehicleFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'All Vehicles', value: '' },
              ...vehicles.map((v) => ({ label: v.vehicleName, value: v._id })),
            ]}
          />
          <Select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'All Categories', value: '' },
              ...categories.map((c) => ({ label: c.name, value: c._id })),
            ]}
          />
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'expenseDate' | 'amount')}
            options={[
              { label: 'Sort: Latest Date', value: 'expenseDate' },
              { label: 'Sort: Highest Amount', value: 'amount' },
            ]}
          />
        </div>
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
            Loading expenses...
          </div>
        ) : expenses.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Receipt className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
              No expenses found
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Record a general expense, fuel fill-up, or maintenance service.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {expenses.map((exp) => {
                const vehicle = exp.vehicleId as VehicleRef;
                const category = exp.categoryId as ExpenseCategory;
                return (
                  <div
                    key={exp._id}
                    className="flex flex-col justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="blue">{category?.name ?? 'Expense'}</Badge>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {exp.description || category?.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {vehicle?.vehicleName ?? 'Vehicle'} · {formatDate(exp.expenseDate)} ·{' '}
                        {exp.paymentMethod}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(exp.amount, exp.currency || currency)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(exp._id)}
                        className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-xs dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
