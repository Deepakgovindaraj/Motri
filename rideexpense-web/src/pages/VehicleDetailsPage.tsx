import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react';
import { VehicleVisual } from '../components/VehicleVisual';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { VehicleForm } from '../features/vehicles/VehicleForm';
import { vehicleService } from '../services/vehicleService';
import { Vehicle, VehiclePayload } from '../types';
import { formatDate, formatNumber, getApiErrorMessage } from '../utils/formatters';

export function VehicleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { preferences } = useAuth();
  const toast = useToast();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    async function load() {
      setIsLoading(true);
      try {
        const data = await vehicleService.getById(id!);
        if (active) setVehicle(data);
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, 'Vehicle not found'));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const handleUpdate = async (payload: VehiclePayload) => {
    if (!id) return;
    setUpdateError(null);
    try {
      const updated = await vehicleService.update(id, payload);
      setVehicle(updated);
      setIsEditing(false);
      toast.success(`"${updated.vehicleName}" details updated.`, 'Vehicle Updated');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to update vehicle');
      setUpdateError(msg);
      toast.error(msg);
    }
  };

  const handleDelete = async () => {
    if (!vehicle) return;
    const confirmed = await toast.confirm({
      title: 'Delete Vehicle',
      message: `Delete "${vehicle.vehicleName}"? This action cannot be undone.`,
      confirmLabel: 'Delete Vehicle',
      tone: 'danger',
    });
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await vehicleService.remove(vehicle._id);
      toast.success(`"${vehicle.vehicleName}" deleted.`, 'Vehicle Deleted');
      navigate('/vehicles', { replace: true });
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to delete vehicle');
      setError(msg);
      toast.error(msg);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-[#7D827A] dark:text-[#8E938B]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading vehicle...
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <p className="text-sm font-medium text-[#B42318] dark:text-[#FCA5A5]">{error || 'Vehicle not found'}</p>
        <Link to="/vehicles" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#171A18] underline dark:text-[#C5F467]">
          <ArrowLeft className="h-4 w-4" /> Return to Garage
        </Link>
      </Card>
    );
  }

  const distanceUnit = preferences?.distanceUnit ?? 'km';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/vehicles"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5C615A] hover:text-[#171A18] dark:text-[#A6AAA3] dark:hover:text-[#F4F3ED]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Garage
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#171A18] dark:text-[#F4F3ED]">
              {vehicle.vehicleName}
            </h1>
            <Badge variant="sage">{vehicle.vehicleType}</Badge>
          </div>
          <p className="mt-1 text-sm text-[#5C615A] dark:text-[#B0B4AD]">
            {vehicle.brand} {vehicle.model} · {vehicle.registrationNumber}
          </p>
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit Vehicle
            </Button>
            <Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <Card className="p-6 sm:p-8">
          <h2 className="mb-6 text-lg font-bold text-[#171A18] dark:text-[#F4F3ED]">Edit Specifications</h2>
          <VehicleForm
            initialValues={vehicle}
            submitLabel="Update Vehicle"
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            serverError={updateError}
          />
        </Card>
      ) : (
        <Card className="p-6 sm:p-8">
          <VehicleVisual
            imageUrl={vehicle.vehicleImage}
            vehicleType={vehicle.vehicleType}
            vehicleName={vehicle.vehicleName}
            className="mb-6 h-56 w-full"
          />
          <dl className="grid gap-6 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#7D827A] dark:text-[#8E938B]">Registration</dt>
              <dd className="mt-1 text-sm font-bold text-[#171A18] dark:text-[#F4F3ED]">{vehicle.registrationNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#7D827A] dark:text-[#8E938B]">Make &amp; Model</dt>
              <dd className="mt-1 text-sm font-bold text-[#171A18] dark:text-[#F4F3ED]">
                {vehicle.brand} {vehicle.model}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#7D827A] dark:text-[#8E938B]">Year</dt>
              <dd className="mt-1 text-sm font-bold tabular-nums text-[#171A18] dark:text-[#F4F3ED]">{vehicle.manufacturingYear}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#7D827A] dark:text-[#8E938B]">Fuel Type</dt>
              <dd className="mt-1 text-sm font-bold text-[#171A18] dark:text-[#F4F3ED]">{vehicle.fuelType}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#7D827A] dark:text-[#8E938B]">Current Odometer</dt>
              <dd className="mt-1 text-sm font-bold tabular-nums text-[#171A18] dark:text-[#F4F3ED]">
                {formatNumber(vehicle.currentOdometer, 0)} {distanceUnit}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#7D827A] dark:text-[#8E938B]">Expected Mileage</dt>
              <dd className="mt-1 text-sm font-bold tabular-nums text-[#171A18] dark:text-[#F4F3ED]">
                {vehicle.expectedMileage ? `${vehicle.expectedMileage} ${distanceUnit}/unit` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#7D827A] dark:text-[#8E938B]">Tank / Battery</dt>
              <dd className="mt-1 text-sm font-bold tabular-nums text-[#171A18] dark:text-[#F4F3ED]">
                {vehicle.tankCapacity ? `${vehicle.tankCapacity} units` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#7D827A] dark:text-[#8E938B]">Purchase Date</dt>
              <dd className="mt-1 text-sm font-bold text-[#171A18] dark:text-[#F4F3ED]">{formatDate(vehicle.purchaseDate)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-[#7D827A] dark:text-[#8E938B]">Registered On</dt>
              <dd className="mt-1 text-sm font-bold text-[#171A18] dark:text-[#F4F3ED]">{formatDate(vehicle.createdAt)}</dd>
            </div>
          </dl>
        </Card>
      )}
    </div>
  );
}
