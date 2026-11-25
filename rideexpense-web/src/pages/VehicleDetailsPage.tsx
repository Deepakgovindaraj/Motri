import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import { VehicleForm } from '../features/vehicles/VehicleForm';
import { vehicleService } from '../services/vehicleService';
import { Vehicle, VehiclePayload } from '../types';
import { formatDate, formatNumber, getApiErrorMessage } from '../utils/formatters';

export function VehicleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { preferences } = useAuth();
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
    } catch (err) {
      setUpdateError(getApiErrorMessage(err, 'Failed to update vehicle'));
    }
  };

  const handleDelete = async () => {
    if (!vehicle) return;
    if (!window.confirm(`Delete "${vehicle.vehicleName}"? This cannot be undone.`)) return;
    setIsDeleting(true);
    try {
      await vehicleService.remove(vehicle._id);
      navigate('/vehicles', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete vehicle'));
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-electric-600" />
        Loading vehicle details...
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          {error || 'Vehicle not found'}
        </p>
        <Link
          to="/vehicles"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-electric-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Vehicles
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
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vehicles
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {vehicle.vehicleName}
            </h1>
            <Badge variant="blue">{vehicle.vehicleType}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {vehicle.brand} {vehicle.model} · {vehicle.registrationNumber}
          </p>
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4" />
              Edit Vehicle
            </Button>
            <Button variant="danger" isLoading={isDeleting} onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <Card className="p-6 sm:p-8">
          <h2 className="mb-6 text-lg font-semibold text-slate-900 dark:text-white">
            Edit Vehicle Specifications
          </h2>
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
          <h2 className="mb-6 text-base font-semibold text-slate-900 dark:text-white">
            Vehicle Specifications
          </h2>
          <dl className="grid gap-6 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Registration Number
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {vehicle.registrationNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Brand &amp; Model
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {vehicle.brand} {vehicle.model}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Manufacturing Year
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {vehicle.manufacturingYear}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Fuel / Energy Type
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {vehicle.fuelType}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Current Odometer
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {formatNumber(vehicle.currentOdometer, 0)} {distanceUnit}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Expected Mileage
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {vehicle.expectedMileage ? `${vehicle.expectedMileage} ${distanceUnit}/unit` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tank / Battery Capacity
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {vehicle.tankCapacity ? `${vehicle.tankCapacity} units` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Purchase Date
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {formatDate(vehicle.purchaseDate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Added On
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                {formatDate(vehicle.createdAt)}
              </dd>
            </div>
          </dl>
        </Card>
      )}
    </div>
  );
}
