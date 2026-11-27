import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, LocateFixed } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { TripLocationPoint } from '../types';
import { formatNumber } from '../utils/formatters';
import { buildRoadAwarePath } from '../utils/location';

type MapLayerMode = 'street' | 'satellite';

export function TripMap({
  points,
  routePoints,
  isLive = false,
  liveDistanceKm = 0,
  accuracyMeters = null,
  distanceUnit = 'km',
  className = 'h-80 w-full',
}: {
  points: TripLocationPoint[];
  routePoints?: TripLocationPoint[];
  isLive?: boolean;
  liveDistanceKm?: number;
  accuracyMeters?: number | null;
  distanceUnit?: string;
  className?: string;
}) {
  const { isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [mode, setMode] = useState<MapLayerMode>('street');
  const [followLive, setFollowLive] = useState(true);
  const [resolvedPath, setResolvedPath] = useState<TripLocationPoint[]>(points);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [11.0168, 76.9558],
      zoom: 13,
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

    // Pause auto-follow if the rider manually drags the map to inspect an area
    const onDrag = () => setFollowLive(false);
    map.on('dragstart', onDrag);

    return () => {
      map.off('dragstart', onDrag);
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      labelsLayerRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Re-enable auto-follow whenever a new live ride begins
  useEffect(() => {
    if (isLive) {
      setFollowLive(true);
    }
  }, [isLive]);

  // Switch between Street Map and Satellite layers
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

  // Ensure route follows actual roads for both live and historical trips
  useEffect(() => {
    if (routePoints && routePoints.length > 0) {
      setResolvedPath(routePoints);
      return;
    }

    setResolvedPath(points);
    if (points.length < 2) return;

    let cancelled = false;
    void buildRoadAwarePath(points).then((res) => {
      if (!cancelled) {
        setResolvedPath(res.pathPoints);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [points, routePoints]);

  // Draw route polyline, start/current/end markers, accuracy halo, and auto-follow viewport
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const pathSource = resolvedPath.length > 0 ? resolvedPath : points;
    if (pathSource.length === 0) return;

    const pathLatLngs = pathSource.map((p) => [p.latitude, p.longitude] as [number, number]);
    const latestPoint = points[points.length - 1] ?? pathSource[pathSource.length - 1];
    const latestLatLng: [number, number] = [latestPoint.latitude, latestPoint.longitude];
    const useLimeRoute = mode === 'satellite' || isDark || isLive;

    if (pathLatLngs.length >= 2) {
      L.polyline(pathLatLngs, {
        color: '#171A18',
        weight: useLimeRoute ? 7 : 5,
        opacity: useLimeRoute ? 0.75 : 0.9,
      }).addTo(group);

      const polyline = L.polyline(pathLatLngs, {
        color: useLimeRoute ? '#C5F467' : '#171A18',
        weight: 4,
        opacity: 0.98,
      }).addTo(group);

      if (isLive && followLive) {
        map.panTo(latestLatLng, { animate: true, duration: 0.6 });
        if (map.getZoom() < 15) {
          map.setView(latestLatLng, 16, { animate: true });
        }
      } else if (!isLive) {
        map.fitBounds(polyline.getBounds(), { padding: [36, 36], maxZoom: 16 });
      }
    } else {
      map.setView(latestLatLng, 16);
    }

    // Start marker
    const startPoint = points[0] ?? pathSource[0];
    L.circleMarker([startPoint.latitude, startPoint.longitude], {
      radius: 7,
      color: '#171A18',
      weight: 2.5,
      fillColor: '#FFFFFF',
      fillOpacity: 1,
    })
      .bindPopup('Start Point')
      .addTo(group);

    if (isLive) {
      const acc = accuracyMeters ?? latestPoint.accuracy;
      if (acc && acc <= 250) {
        L.circle(latestLatLng, {
          radius: Math.max(10, acc),
          color: '#171A18',
          weight: 1,
          opacity: 0.35,
          fillColor: '#C5F467',
          fillOpacity: 0.2,
        }).addTo(group);
      }

      const liveIcon = L.divIcon({
        className: 'vehixa-live-puck-wrapper',
        html: '<div class="vehixa-live-puck"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker(latestLatLng, { icon: liveIcon }).bindPopup('Live Bike Location').addTo(group);
    } else if (pathLatLngs.length > 1) {
      L.circleMarker(latestLatLng, {
        radius: 7,
        color: '#C5F467',
        weight: 2.5,
        fillColor: '#171A18',
        fillOpacity: 1,
      })
        .bindPopup('Destination')
        .addTo(group);
    }
  }, [points, resolvedPath, mode, isDark, isLive, followLive, accuracyMeters]);

  const handleRecenter = () => {
    const map = mapRef.current;
    const latest = points[points.length - 1] ?? resolvedPath[resolvedPath.length - 1];
    setFollowLive(true);
    if (map && latest) {
      map.setView([latest.latitude, latest.longitude], Math.max(map.getZoom(), 16), {
        animate: true,
      });
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-[12px] border border-[#E4E2D9] bg-[#FAF9F5] dark:border-[#2B302C] dark:bg-[#171A18] ${
        mode === 'street' ? 'trip-map-street' : ''
      } ${className}`}
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Live Commuting HUD (Top-Left) */}
      {isLive && (
        <div className="pointer-events-none absolute left-12 top-3 z-[400] hidden items-center gap-2 rounded-[10px] border border-[#2B302C] bg-[#171A18]/90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-sm sm:inline-flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#C5F467]" />
          <span className="tabular-nums text-[#C5F467]">
            {formatNumber(liveDistanceKm, 2)} {distanceUnit}
          </span>
          {accuracyMeters ? (
            <span className="text-[11px] text-[#A6AAA3]">· GPS ±{accuracyMeters}m</span>
          ) : null}
        </div>
      )}

      {/* Top-Right Controls: Follow Re-center & Street / Satellite Switcher */}
      <div className="absolute right-3 top-3 z-[400] flex items-center gap-2">
        {isLive && (
          <button
            type="button"
            onClick={handleRecenter}
            aria-label="Center on live location"
            className={`inline-flex items-center gap-1 rounded-[10px] border px-2.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-sm transition-colors ${
              followLive
                ? 'border-[#171A18] bg-[#C5F467] text-[#171A18]'
                : 'border-[#E4E2D9] bg-white/95 text-[#171A18] hover:bg-[#FAF9F5] dark:border-[#343A35] dark:bg-[#171A18]/95 dark:text-[#F4F3ED]'
            }`}
          >
            <LocateFixed className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{followLive ? 'Following' : 'Re-center'}</span>
          </button>
        )}

        <div className="inline-flex items-center gap-1 rounded-[10px] border border-[#E4E2D9] bg-white/95 p-1 shadow-sm backdrop-blur-sm dark:border-[#343A35] dark:bg-[#171A18]/95">
          <Layers className="ml-1.5 mr-1 h-3.5 w-3.5 text-[#5C615A] dark:text-[#A6AAA3]" />
          <button
            type="button"
            onClick={() => setMode('street')}
            className={`rounded-[7px] px-2.5 py-1 text-xs font-semibold transition-colors ${
              mode === 'street'
                ? 'bg-[#171A18] text-[#C5F467] dark:bg-[#C5F467] dark:text-[#171A18]'
                : 'text-[#5C615A] hover:text-[#171A18] dark:text-[#A6AAA3] dark:hover:text-[#F4F3ED]'
            }`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setMode('satellite')}
            className={`rounded-[7px] px-2.5 py-1 text-xs font-semibold transition-colors ${
              mode === 'satellite'
                ? 'bg-[#171A18] text-[#C5F467] dark:bg-[#C5F467] dark:text-[#171A18]'
                : 'text-[#5C615A] hover:text-[#171A18] dark:text-[#A6AAA3] dark:hover:text-[#F4F3ED]'
            }`}
          >
            Satellite
          </button>
        </div>
      </div>

      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[400] flex justify-center">
          <span className="rounded-[8px] border border-[#E4E2D9] bg-white/95 px-3 py-1.5 text-xs font-medium text-[#5C615A] shadow-sm dark:border-[#343A35] dark:bg-[#171A18]/95 dark:text-[#B0B4AD]">
            {isLive
              ? 'Acquiring live GPS satellite fix for your commuting path...'
              : 'Start a GPS ride or select a GPS trip from history to plot its route'}
          </span>
        </div>
      )}
    </div>
  );
}
