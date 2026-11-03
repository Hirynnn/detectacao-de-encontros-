import { PositionRecord } from './types';

export const EARTH_RADIUS_METERS = 6_371_000;

export function haversineMeters(a: Pick<PositionRecord, 'latitude' | 'longitude'>, b: Pick<PositionRecord, 'latitude' | 'longitude'>): number {
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const lat1 = rad(a.latitude), lat2 = rad(b.latitude);
  const dLat = lat2 - lat1, dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, h)));
}
