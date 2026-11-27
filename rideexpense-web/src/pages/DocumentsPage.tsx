import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ExternalLink, FileText, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { DataTable, TableColumn } from '../components/ui/DataTable';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { StatusIndicator } from '../components/ui/StatusIndicator';
import { useToast } from '../context/ToastContext';
import { documentService } from '../services/documentService';
import { vehicleService } from '../services/vehicleService';
import { DocumentCategory, Vehicle, VehicleDocumentItem, VehicleRef } from '../types';
import { formatDate, getApiErrorMessage } from '../utils/formatters';

interface DocumentFormValues {
  vehicleId: string;
  documentType: DocumentCategory;
  title: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  fileUrl: string;
  notes: string;
}

function getExpiryStatus(expiryDate?: string): {
  tone: 'positive' | 'warning' | 'danger' | 'neutral';
  label: string;
} {
  if (!expiryDate) return { tone: 'neutral', label: 'No expiry' };
  const diffDays = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return { tone: 'danger', label: 'Expired' };
  if (diffDays <= 30) return { tone: 'warning', label: `Expires in ${diffDays}d` };
  return { tone: 'positive', label: 'Valid' };
}

export function DocumentsPage() {
  const toast = useToast();
  const [documents, setDocuments] = useState<VehicleDocumentItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [typeFilter, setTypeFilter] = useState<DocumentCategory | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [uploadedDataUrl, setUploadedDataUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<DocumentFormValues>({
    defaultValues: {
      documentType: 'Insurance',
      vehicleId: '',
    },
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [docs, vehs] = await Promise.all([
        documentService.list({ documentType: typeFilter }),
        vehicleService.list({ limit: 50 }),
      ]);
      setDocuments(docs);
      setVehicles(vehs.items);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load documents'));
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 900 * 1024) {
      setFormError('File size must be under 900 KB for direct storage, or provide a document URL.');
      return;
    }
    setFormError(null);
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setUploadedDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (values: DocumentFormValues) => {
    setFormError(null);
    try {
      await documentService.create({
        vehicleId: values.vehicleId || undefined,
        documentType: values.documentType,
        title: values.title,
        documentNumber: values.documentNumber || undefined,
        issueDate: values.issueDate ? new Date(values.issueDate).toISOString() : undefined,
        expiryDate: values.expiryDate ? new Date(values.expiryDate).toISOString() : undefined,
        fileUrl: uploadedDataUrl || values.fileUrl || undefined,
        fileName: uploadedFileName || undefined,
        notes: values.notes || undefined,
      });
      reset({ documentType: 'Insurance', vehicleId: '' });
      setUploadedDataUrl('');
      setUploadedFileName('');
      setShowModal(false);
      toast.success(`"${values.title}" stored in Document Vault.`, 'Document Saved');
      await loadData();
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to save document');
      setFormError(msg);
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await toast.confirm({
      title: 'Delete Document',
      message: 'Delete this document record permanently?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await documentService.remove(id);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      toast.success('Document record deleted.', 'Document Deleted');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to delete document');
      setError(msg);
      toast.error(msg);
    }
  };

  const expiryTimeline = useMemo(
    () => documents.filter((d) => Boolean(d.expiryDate)).slice(0, 6),
    [documents],
  );

  const columns: TableColumn<VehicleDocumentItem>[] = [
    {
      key: 'title',
      header: 'Document',
      render: (doc) => (
        <div>
          <p className="font-bold text-[#171A18] dark:text-[#F4F3ED]">{doc.title}</p>
          <p className="text-xs text-[#7D827A] dark:text-[#8E938B]">
            {doc.documentNumber ? `#${doc.documentNumber} · ` : ''}
            {(doc.vehicleId as VehicleRef)?.vehicleName ?? 'Personal / All Vehicles'}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (doc) => <Badge variant="neutral">{doc.documentType}</Badge>,
    },
    {
      key: 'expiry',
      header: 'Expiry Date',
      render: (doc) => (
        <span className="text-xs text-[#5C615A] dark:text-[#B0B4AD]">{formatDate(doc.expiryDate)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (doc) => {
        const st = getExpiryStatus(doc.expiryDate);
        return <StatusIndicator tone={st.tone} label={st.label} />;
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (doc) => (
        <div className="flex items-center justify-end gap-2">
          {doc.fileUrl && (
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noreferrer"
              download={doc.fileName || undefined}
              className="inline-flex items-center gap-1 rounded-[8px] border border-[#E4E2D9] px-2.5 py-1 text-xs font-semibold text-[#171A18] hover:bg-[#F4F3ED] dark:border-[#343A35] dark:text-[#F4F3ED] dark:hover:bg-[#232724]"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View
            </a>
          )}
          <Button variant="ghost" size="sm" onClick={() => void handleDelete(doc._id)}>
            <Trash2 className="h-4 w-4 text-[#B42318] dark:text-[#F87171]" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#171A18] dark:text-[#F4F3ED]">
            Document Vault
          </h1>
          <p className="mt-1 text-sm text-[#5C615A] dark:text-[#B0B4AD]">
            Insurance policies, registration certificates, pollution (PUC), and driver licences.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DocumentCategory | '')}
            options={[
              { label: 'All Types', value: '' },
              { label: 'Insurance', value: 'Insurance' },
              { label: 'Registration', value: 'Registration' },
              { label: 'Pollution Certificate', value: 'Pollution Certificate' },
              { label: 'Licence', value: 'Licence' },
              { label: 'Warranty', value: 'Warranty' },
              { label: 'Other', value: 'Other' },
            ]}
          />
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Upload Document
          </Button>
        </div>
      </div>

      {/* Expiry Timeline */}
      {expiryTimeline.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-[#7D827A] dark:text-[#8E938B]">
            Expiry Timeline
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {expiryTimeline.map((doc) => {
              const st = getExpiryStatus(doc.expiryDate);
              return (
                <div
                  key={doc._id}
                  className="flex items-center justify-between gap-2 rounded-[10px] border border-[#E4E2D9] bg-[#FAF9F5] p-3.5 dark:border-[#2B302C] dark:bg-[#1E221F]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#171A18] dark:text-[#F4F3ED]">{doc.title}</p>
                    <p className="text-xs text-[#5C615A] dark:text-[#B0B4AD]">
                      {doc.documentType} · {formatDate(doc.expiryDate)}
                    </p>
                  </div>
                  <StatusIndicator tone={st.tone} label={st.label} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {error && (
        <div className="rounded-[12px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-sm text-[#B42318] dark:border-[#5C2320] dark:bg-[#2B1514] dark:text-[#FCA5A5]">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-[#7D827A] dark:text-[#8E938B]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading documents...
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={documents}
            keyExtractor={(d) => d._id}
            emptyState={
              <div className="px-6 py-16 text-center">
                <FileText className="mx-auto h-10 w-10 text-[#A6AAA3]" />
                <h3 className="mt-3 text-base font-bold text-[#171A18] dark:text-[#F4F3ED]">No documents stored yet</h3>
                <p className="mt-1 text-sm text-[#5C615A] dark:text-[#B0B4AD]">
                  Upload insurance, registration, PUC, or licence records to monitor expiry dates.
                </p>
              </div>
            }
          />
        )}
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Vehicle Document"
        subtitle="Attach a file or document link with optional expiry tracking."
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {formError && (
            <div className="rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-2.5 text-sm text-[#B42318] dark:border-[#5C2320] dark:bg-[#2B1514] dark:text-[#FCA5A5]">
              {formError}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Document Type"
              options={[
                { label: 'Insurance', value: 'Insurance' },
                { label: 'Registration', value: 'Registration' },
                { label: 'Pollution Certificate', value: 'Pollution Certificate' },
                { label: 'Licence', value: 'Licence' },
                { label: 'Warranty', value: 'Warranty' },
                { label: 'Other', value: 'Other' },
              ]}
              {...register('documentType')}
            />
            <Select
              label="Linked Vehicle"
              options={[
                { label: 'Personal / All Vehicles', value: '' },
                ...vehicles.map((v) => ({ label: v.vehicleName, value: v._id })),
              ]}
              {...register('vehicleId')}
            />
            <Input
              label="Document Title"
              placeholder="e.g. Comprehensive Insurance 2026"
              {...register('title', { required: true })}
            />
            <Input
              label="Document / Policy Number"
              placeholder="Optional reference number"
              {...register('documentNumber')}
            />
            <Input label="Issue Date" type="date" {...register('issueDate')} />
            <Input label="Expiry Date" type="date" {...register('expiryDate')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-[#5C615A] dark:text-[#A6AAA3]">
                Upload File (PDF / Image &le; 900 KB)
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-dashed border-[#DCDAD0] bg-[#FAF9F5] px-3.5 py-2.5 text-xs font-medium text-[#171A18] hover:border-[#171A18] dark:border-[#343A35] dark:bg-[#1E221F] dark:text-[#F4F3ED] dark:hover:border-[#C5F467]">
                <Upload className="h-4 w-4" />
                <span className="truncate">{uploadedFileName || 'Choose file...'}</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            <Input
              label="Or Document URL"
              type="url"
              placeholder="https://..."
              {...register('fileUrl')}
            />
          </div>

          <Input label="Notes" placeholder="Optional notes" {...register('notes')} />

          <div className="flex justify-end gap-3 border-t border-[#ECEAE2] pt-4 dark:border-[#262B27]">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
