import { useState } from 'react';
import { Bike, Car, Zap } from 'lucide-react';
import { VehicleType } from '../types';

export function VehicleVisual({
  imageUrl,
  vehicleType,
  vehicleName,
  dark = false,
  className = '',
}: {
  imageUrl?: string;
  vehicleType: VehicleType;
  vehicleName: string;
  dark?: boolean;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imageUrl && !imgFailed) {
    return (
      <div
        className={`relative overflow-hidden rounded-[12px] ${
          dark ? 'bg-[#232724]' : 'bg-[#F4F3ED] dark:bg-[#232724]'
        } ${className}`}
      >
        <img
          src={imageUrl}
          alt={vehicleName}
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-[12px] border ${
        dark
          ? 'border-[#2B302C] bg-[#1F2320] text-white'
          : 'border-[#E4E2D9] bg-[#FAF9F5] text-[#171A18] dark:border-[#2B302C] dark:bg-[#1E221F] dark:text-[#F4F3ED]'
      } ${className}`}
    >
      {/* Subtle architectural grid lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 py-8 text-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-[12px] ${
            dark
              ? 'bg-[#C5F467] text-[#171A18]'
              : 'bg-[#171A18] text-[#C5F467] dark:bg-[#C5F467] dark:text-[#171A18]'
          }`}
        >
          {vehicleType === 'Bike' || vehicleType === 'Scooter' ? (
            <Bike className="h-7 w-7" />
          ) : vehicleType === 'Electric vehicle' ? (
            <Zap className="h-7 w-7" />
          ) : (
            <Car className="h-7 w-7" />
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-60">
            {vehicleType}
          </p>
          <p className="mt-0.5 text-sm font-semibold">{vehicleName}</p>
        </div>
      </div>
    </div>
  );
}
