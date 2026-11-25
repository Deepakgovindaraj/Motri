import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { VehicleForm } from '../features/vehicles/VehicleForm';
import { vehicleService } from '../services/vehicleService';
import { VehiclePayload } from '../types';
import { getApiErrorMessage } from '../utils/formatters';

export function AddVehiclePage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (payload: VehiclePayload) => {
    setServerError(null);
    try {
      const created = await vehicleService.create(payload);
      navigate(`/vehicles/${created._id}`, { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'Could not register vehicle.'));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to="/vehicles"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Vehicles
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Register New Vehicle
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Add specifications and initial odometer reading for your vehicle.
        </p>
      </div>

      <Card className="p-6 sm:p-8">
        <VehicleForm
          submitLabel="Save Vehicle"
          onSubmit={handleSubmit}
          onCancel={() => navigate('/vehicles')}
          serverError={serverError}
        />
      </Card>
    </div>
  );
}
