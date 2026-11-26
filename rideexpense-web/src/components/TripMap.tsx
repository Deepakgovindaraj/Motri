import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers } from 'lucide-react';
import { TripLocationPoint } from '../types';

type MapLayerMode = 'street' | 'satellite';

export function TripMap({
  points,
  className = 'h-80 w-full',
}: {
  points: TripLocationPoint[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const [mode, setMode] = useState<MapLayerMode>('street');

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true,
    });

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    tileLayerRef.current = streetLayer;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      labelsLayerRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    if (labelsLayerRef.current) {
      map.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }

    if (mode === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 19,
        },
      ).addTo(map);

      labelsLayerRef.current = L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
        },
      ).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
    }
  }, [mode]);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (points.length === 0) return;

    const latLngs = points.map((p) => [p.latitude, p.longitude] as [number, number]);
    const isSat = mode === 'satellite';

    if (latLngs.length >= 2) {
      if (isSat) {
        L.polyline(latLngs, { color: '#171A18', weight: 6, opacity: 0.7 }).addTo(group);
      }
      const polyline = L.polyline(latLngs, {
        color: isSat ? '#C5F467' : '#171A18',
        weight: 4,
        opacity: 0.95,
      }).addTo(group);
      map.fitBounds(polyline.getBounds(), { padding: [36, 36], maxZoom: 16 });
    } else {
      map.setView(latLngs[0], 15);
    }

    L.circleMarker(latLngs[0], {
      radius: 7,
      color: '#171A18',
      weight: 2,
      fillColor: '#C5F467',
      fillOpacity: 1,
    })
      .bindPopup('Start')
      .addTo(group);

    if (latLngs.length > 1) {
      L.circleMarker(latLngs[latLngs.length - 1], {
        radius: 7,
        color: '#C5F467',
        weight: 2,
        fillColor: '#171A18',
        fillOpacity: 1,
      })
        .bindPopup('End')
        .addTo(group);
    }
  }, [points, mode]);

  return (
    <div
      className={`relative overflow-hidden rounded-[12px] border border-[#E4E2D9] bg-[#FAF9F5] ${className}`}
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Street / Satellite Mode Switcher */}
      <div className="absolute right-3 top-3 z-[400] inline-flex items-center gap-1 rounded-[10px] border border-[#E4E2D9] bg-white/95 p-1 shadow-sm backdrop-blur-sm">
        <Layers className="ml-1.5 mr-1 h-3.5 w-3.5 text-[#5C615A]" />
        <button
          type="button"
          onClick={() => setMode('street')}
          className={`rounded-[7px] px-2.5 py-1 text-xs font-semibold transition-colors ${
            mode === 'street'
              ? 'bg-[#171A18] text-[#C5F467]'
              : 'text-[#5C615A] hover:text-[#171A18]'
          }`}
        >
          Map
        </button>
        <button
          type="button"
          onClick={() => setMode('satellite')}
          className={`rounded-[7px] px-2.5 py-1 text-xs font-semibold transition-colors ${
            mode === 'satellite'
              ? 'bg-[#171A18] text-[#C5F467]'
              : 'text-[#5C615A] hover:text-[#171A18]'
          }`}
        >
          Satellite
        </button>
      </div>

      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[400] flex justify-center">
          <span className="rounded-[8px] border border-[#E4E2D9] bg-white/95 px-3 py-1.5 text-xs font-medium text-[#5C615A] shadow-sm">
            Start a GPS ride or select a GPS trip from history to plot its route
          </span>
        </div>
      )}
    </div>
  );
}
