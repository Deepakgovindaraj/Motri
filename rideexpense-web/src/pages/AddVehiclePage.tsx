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
      await vehicleService.create(payload);
      navigate('/vehicles', { replace: true });
    } catch (error) {
      setServerError(getApiErrorMessage(error, 'Could not register vehicle.'));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to="/vehicles"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5C615A] hover:text-[#171A18]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Garage
        </Link>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#171A18]">
          Register Vehicle
        </h1>
        <p className="mt-1 text-sm text-[#5C615A]">
          Add technical specifications, fuel profile, and initial odometer reading.
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
