import { TripLocationPoint } from '../types';

export interface DetectedCoordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number | null;
  timestamp: number;
  label: string;
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculatePolylineDistanceKm(points: Array<{ latitude: number; longitude: number }>): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineDistanceKm(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude,
    );
  }
  return Number(total.toFixed(3));
}

export async function reverseGeocodeLabel(lat: number, lon: number): Promise<string> {
  const fallback = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      },
    );
    window.clearTimeout(timer);
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      name?: string;
      display_name?: string;
      address?: {
        road?: string;
        residential?: string;
        neighbourhood?: string;
        suburb?: string;
        city_district?: string;
        city?: string;
        town?: string;
        village?: string;
        county?: string;
      };
    };
    const a = data.address;
    const rawParts = [
      data.name || a?.road || a?.residential,
      a?.neighbourhood || a?.suburb || a?.city_district || a?.village,
      a?.city || a?.town || a?.county,
    ].filter((part): part is string => Boolean(part && part.trim()));

    // Deduplicate adjacent identical labels
    const uniqueParts = rawParts.filter(
      (part, idx) => rawParts.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === idx,
    );

    if (uniqueParts.length > 0) return uniqueParts.join(', ');
    if (data.display_name) {
      return data.display_name.split(',').slice(0, 3).map((s) => s.trim()).join(', ');
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Acquires the highest-accuracy GPS coordinate available within a short sampling window.
 * Uses `maximumAge: 0` and `watchPosition` so mobile browsers refine past initial cell/Wi-Fi fixes.
 */
export function detectCurrentPosition(options?: {
  desiredAccuracyMeters?: number;
  maxWaitMs?: number;
}): Promise<DetectedCoordinate> {
  const desiredAccuracy = options?.desiredAccuracyMeters ?? 25;
  const maxWaitMs = options?.maxWaitMs ?? 4500;

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location services are not supported by this browser.'));
      return;
    }

    let settled = false;
    let watchId: number | null = null;
    let bestPosition: GeolocationPosition | null = null;
    let refineTimer: number | null = null;
    let hardTimeout: number | null = null;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (refineTimer !== null) {
        window.clearTimeout(refineTimer);
        refineTimer = null;
      }
      if (hardTimeout !== null) {
        window.clearTimeout(hardTimeout);
        hardTimeout = null;
      }
    };

    const finalize = async (pos: GeolocationPosition) => {
      if (settled) return;
      settled = true;
      cleanup();
      const label = await reverseGeocodeLabel(pos.coords.latitude, pos.coords.longitude);
      resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed,
        timestamp: pos.timestamp || Date.now(),
        label,
      });
    };

    hardTimeout = window.setTimeout(() => {
      if (bestPosition) {
        void finalize(bestPosition);
      } else if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('GPS signal timed out. Turn on device Location / High Accuracy mode.'));
      }
    }, 12000);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (settled) return;

        if (!bestPosition || pos.coords.accuracy <= bestPosition.coords.accuracy) {
          bestPosition = pos;
        }

        // Sharp GPS lock achieved — return right away
        if (pos.coords.accuracy <= desiredAccuracy) {
          void finalize(pos);
          return;
        }

        // Start a refinement window once we have a first fix so coarse cell fixes can sharpen into GPS
        if (refineTimer === null) {
          refineTimer = window.setTimeout(() => {
            if (bestPosition) {
              void finalize(bestPosition);
            }
          }, maxWaitMs);
        }
      },
      (err) => {
        if (settled) return;
        if (bestPosition) {
          void finalize(bestPosition);
          return;
        }
        settled = true;
        cleanup();
        reject(
          new Error(
            err.code === 1
              ? 'Location permission denied. Allow location access in browser settings.'
              : err.message || 'Unable to detect your exact location.',
          ),
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
    );
  });
}

// Cache road-snapped segments between coordinate pairs so repeated renders stay instant
const osrmSegmentCache = new Map<string, Array<{ latitude: number; longitude: number }>>();
const GAP_SNAP_THRESHOLD_KM = 0.35; // 350m+ gap (e.g. screen sleep or sparse fix) snaps along roads

async function fetchOsrmRoadChain(
  waypoints: Array<{ latitude: number; longitude: number }>,
): Promise<Array<{ latitude: number; longitude: number }> | null> {
  if (waypoints.length < 2) return null;
  const key = waypoints
    .map((p) => `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`)
    .join('->');
  const cached = osrmSegmentCache.get(key);
  if (cached) return cached;

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    const coordStr = waypoints.map((p) => `${p.longitude},${p.latitude}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    window.clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{ geometry?: { coordinates?: Array<[number, number]> } }>;
    };
    const coords = data.routes?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    const mapped = coords.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
    osrmSegmentCache.set(key, mapped);
    return mapped;
  } catch {
    return null;
  }
}

/**
 * Preserves dense live GPS breadcrumbs and snaps large gaps (>350m, e.g. from phone screen lock)
 * along actual drivable roads via OSRM so both map polyline and KMs reflect real road travel.
 */
export async function buildRoadAwarePath(
  points: TripLocationPoint[],
): Promise<{ pathPoints: TripLocationPoint[]; distanceKm: number; snappedGaps: number }> {
  if (points.length === 0) {
    return { pathPoints: [], distanceKm: 0, snappedGaps: 0 };
  }
  if (points.length === 1) {
    return { pathPoints: points, distanceKm: 0, snappedGaps: 0 };
  }

  const result: TripLocationPoint[] = [points[0]];
  let snappedGaps = 0;
  let i = 1;

  while (i < points.length) {
    const prev = points[i - 1];
    const curr = points[i];
    const segKm = haversineDistanceKm(prev.latitude, prev.longitude, curr.latitude, curr.longitude);

    if (segKm > GAP_SNAP_THRESHOLD_KM) {
      // Group consecutive sparse points into a single batched OSRM request
      const chain: TripLocationPoint[] = [prev, curr];
      let j = i + 1;
      while (j < points.length && chain.length < 20) {
        const nextSegKm = haversineDistanceKm(
          points[j - 1].latitude,
          points[j - 1].longitude,
          points[j].latitude,
          points[j].longitude,
        );
        if (nextSegKm <= GAP_SNAP_THRESHOLD_KM) break;
        chain.push(points[j]);
        j += 1;
      }

      const roadSeg = await fetchOsrmRoadChain(chain);
      if (roadSeg && roadSeg.length > 2) {
        snappedGaps += chain.length - 1;
        for (let k = 1; k < roadSeg.length - 1; k += 1) {
          result.push({
            latitude: roadSeg[k].latitude,
            longitude: roadSeg[k].longitude,
            recordedAt: prev.recordedAt,
          });
        }
        result.push(chain[chain.length - 1]);
      } else {
        for (let k = 1; k < chain.length; k += 1) {
          result.push(chain[k]);
        }
      }
      i = j;
    } else {
      result.push(curr);
      i += 1;
    }
  }

  return {
    pathPoints: result,
    distanceKm: calculatePolylineDistanceKm(result),
    snappedGaps,
  };
}
