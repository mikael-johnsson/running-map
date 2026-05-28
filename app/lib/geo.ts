export type LngLat = { lng: number; lat: number };

const EARTH_RADIUS_METERS = 6371008.8;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceMeters(a: LngLat, b: LngLat): number {
  const φ1 = toRadians(a.lat);
  const φ2 = toRadians(b.lat);
  const Δφ = toRadians(b.lat - a.lat);
  const Δλ = toRadians(b.lng - a.lng);

  const sinΔφ = Math.sin(Δφ / 2);
  const sinΔλ = Math.sin(Δλ / 2);

  const h = sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * (sinΔλ * sinΔλ);

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Sum of segment distances for a polyline defined by an ordered points array.
 */
export function polylineDistanceMeters(points: LngLat[]): number {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += distanceMeters(points[i], points[i + 1]);
  }
  return total;
}
