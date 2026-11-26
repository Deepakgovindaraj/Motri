export interface DetectedCoordinate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number | null;
  timestamp: number;
  label: string;
}

export async function reverseGeocodeLabel(lat: number, lon: number): Promise<string> {
  const fallback = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=16`,
      {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      },
    );
    window.clearTimeout(timer);
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      name?: string;
      address?: {
        road?: string;
        suburb?: string;
        neighbourhood?: string;
        city?: string;
        town?: string;
        village?: string;
      };
    };
    const a = data.address;
    const parts = [
      data.name || a?.road || a?.neighbourhood || a?.suburb,
      a?.city || a?.town || a?.village,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : fallback;
  } catch {
    return fallback;
  }
}

export function detectCurrentPosition(): Promise<DetectedCoordinate> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location services are not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const label = await reverseGeocodeLabel(pos.coords.latitude, pos.coords.longitude);
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
          label,
        });
      },
      (err) => {
        reject(new Error(err.message || 'Unable to detect your current location.'));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
    );
  });
}
