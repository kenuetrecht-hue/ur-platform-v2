/** Haversine distance and geofence checks for jobsite clock / equipment. */

const EARTH_RADIUS_M = 6_371_000;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsideGeofence(input: {
  lat: number;
  lng: number;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
}): boolean {
  if (input.radiusMeters <= 0) return false;
  return (
    haversineMeters(input.lat, input.lng, input.centerLat, input.centerLng) <=
    input.radiusMeters
  );
}

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}
