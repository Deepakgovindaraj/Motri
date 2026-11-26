import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Fuel, Loader2, PiggyBank, Plus, Receipt, Search, Trash2, Wrench } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, TableColumn } from '../components/ui/DataTable';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
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
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [showModal, setShowModal] = useState(false);
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
        // Error surfaced in main query
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
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(`${endDate}T23:59:59`).toISOString() : undefined,
        sortBy: 'expenseDate',
        sortOrder: 'desc',
        page,
        limit: 15,
      });
      setExpenses(res.items);
      setTotalAmount(res.totalAmount);
      setTotalCount(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load financial ledger'));
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, vehicleFilter, categoryFilter, startDate, endDate, page]);

  useEffect(() => {
    const t = setTimeout(() => void loadExpenses(), 200);
    return () => clearTimeout(t);
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
      setShowModal(false);
      setPage(1);
      await loadExpenses();
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Failed to record expense'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this transaction (and any linked fuel or maintenance entry)?')) {
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

  const columns: TableColumn<Expense>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (exp) => (
        <span className="whitespace-nowrap text-xs font-medium text-[#5C615A] dark:text-[#B0B4AD]">
          {formatDate(exp.expenseDate)}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Transaction',
      render: (exp) => {
        const cat = exp.categoryId as ExpenseCategory;
        return (
          <div>
            <p className="font-semibold text-[#171A18] dark:text-[#F4F3ED]">{exp.description || cat?.name}</p>
            <p className="text-xs text-[#7D827A] dark:text-[#8E938B]">{(exp.vehicleId as VehicleRef)?.vehicleName}</p>
          </div>
        );
      },
    },
    {
      key: 'category',
      header: 'Category',
      render: (exp) => (
        <Badge variant="sage">{(exp.categoryId as ExpenseCategory)?.name ?? 'Expense'}</Badge>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (exp) => <span className="text-xs text-[#5C615A] dark:text-[#B0B4AD]">{exp.paymentMethod}</span>,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (exp) => (
        <span className="font-bold text-[#171A18] dark:text-[#F4F3ED]">
          {formatCurrency(exp.amount, exp.currency || currency)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (exp) => (
        <Button variant="ghost" size="sm" onClick={() => void handleDelete(exp._id)}>
          <Trash2 className="h-4 w-4 text-[#B42318] dark:text-[#F87171]" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header + Sub-navigation */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7D827A] dark:text-[#8E938B]">
            Single-Source Financial Ledger ({totalCount} entries)
          </p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight tabular-nums text-[#171A18] dark:text-[#F4F3ED]">
            {formatCurrency(totalAmount, currency)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/fuel"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E4E2D9] bg-white px-3.5 py-2 text-xs font-semibold text-[#171A18] hover:bg-[#FAF9F5] dark:border-[#2B302C] dark:bg-[#171A18] dark:text-[#F4F3ED] dark:hover:bg-[#1E221F]"
          >
            <Fuel className="h-3.5 w-3.5" /> Fuel Logs
          </Link>
          <Link
            to="/maintenance"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E4E2D9] bg-white px-3.5 py-2 text-xs font-semibold text-[#171A18] hover:bg-[#FAF9F5] dark:border-[#2B302C] dark:bg-[#171A18] dark:text-[#F4F3ED] dark:hover:bg-[#1E221F]"
          >
            <Wrench className="h-3.5 w-3.5" /> Maintenance
          </Link>
          <Link
            to="/budgets"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#E4E2D9] bg-white px-3.5 py-2 text-xs font-semibold text-[#171A18] hover:bg-[#FAF9F5] dark:border-[#2B302C] dark:bg-[#171A18] dark:text-[#F4F3ED] dark:hover:bg-[#1E221F]"
          >
            <PiggyBank className="h-3.5 w-3.5" /> Budgets
          </Link>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#A6AAA3]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search description..."
              className="block w-full rounded-[10px] border border-[#DCDAD0] bg-white py-2.5 pl-9 pr-3.5 text-sm text-[#171A18] placeholder-[#A6AAA3] focus:border-[#171A18] focus:outline-none dark:border-[#343A35] dark:bg-[#1E221F] dark:text-[#F4F3ED] dark:placeholder-[#7D827A] dark:focus:border-[#C5F467]"
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
          <Input
            type="date"
            aria-label="Start date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
          />
          <Input
            type="date"
            aria-label="End date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {error && (
        <div className="rounded-[12px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318] dark:border-[#5C2320] dark:bg-[#2B1514] dark:text-[#FCA5A5]">
          {error}
        </div>
      )}

      {/* Transaction Ledger Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#7D827A] dark:text-[#8E938B]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading ledger...
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={expenses}
              keyExtractor={(row) => row._id}
              emptyState={
                <div className="px-6 py-16 text-center">
                  <Receipt className="mx-auto h-10 w-10 text-[#A6AAA3]" />
                  <h3 className="mt-3 text-base font-bold text-[#171A18] dark:text-[#F4F3ED]">No transactions match</h3>
                  <p className="mt-1 text-sm text-[#5C615A] dark:text-[#B0B4AD]">
                    Add an expense or clear filters to view your financial ledger.
                  </p>
                </div>
              }
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#ECEAE2] px-5 py-3 text-xs text-[#5C615A] dark:border-[#262B27] dark:text-[#B0B4AD]">
                <span>
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

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Record Expense"
        subtitle="Creates a single-source financial entry in your ledger."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div className="rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-2.5 text-sm text-[#B42318] dark:border-[#5C2320] dark:bg-[#2B1514] dark:text-[#FCA5A5]">
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
            <Input label="Receipt URL (optional)" type="url" placeholder="https://..." {...register('attachmentUrl')} />
          </div>
          <Input label="Description" placeholder="e.g. Highway toll or wash" {...register('description')} />
          <div className="flex justify-end gap-3 border-t border-[#ECEAE2] pt-4 dark:border-[#262B27]">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
