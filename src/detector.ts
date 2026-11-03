import { Encounter, EncounterType, PersonId, PositionRecord } from './types';
import { EARTH_RADIUS_METERS, haversineMeters } from './haversine';

const THRESHOLD_METERS = 20;
const CELL_METERS = 20;
const idKey = (id: PersonId) => `${typeof id}:${String(id)}`;

function cellKey(record: PositionRecord): string {
  const latitude = record.latitude * Math.PI / 180;
  const longitude = record.longitude * Math.PI / 180;
  const radius = EARTH_RADIUS_METERS;
  const x = radius * Math.cos(latitude) * Math.cos(longitude);
  const y = radius * Math.cos(latitude) * Math.sin(longitude);
  const z = radius * Math.sin(latitude);
  return `${Math.floor(x / CELL_METERS)},${Math.floor(y / CELL_METERS)},${Math.floor(z / CELL_METERS)}`;
}

export function detectTimestamp(records: PositionRecord[]): Encounter[] {
  const cells = new Map<string, PositionRecord[]>();
  const results: Encounter[] = [];
  const emitted = new Set<string>();
  for (const record of records) {
    const [x, y, z] = cellKey(record).split(',').map(Number);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const candidates = cells.get(`${x + dx},${y + dy},${z + dz}`);
      if (!candidates) continue;
      for (const other of candidates) {
        if (idKey(other.id) === idKey(record.id)) continue;
        const distance = haversineMeters(other, record);
        if (!(distance < THRESHOLD_METERS)) continue;
        const [first, second] = idKey(other.id) < idKey(record.id) ? [other, record] : [record, other];
        const ids: [PersonId, PersonId] = [first.id, second.id];
        const isProtectiveEncounter =
          (first.protectiveMeasure && first.restrictedIds.has(second.id)) ||
          (second.protectiveMeasure && second.restrictedIds.has(first.id));
        const tipo: EncounterType = isProtectiveEncounter
          ? 'protetiva'
          : first.faction && second.faction && first.faction === second.faction
            ? 'faccao'
            : 'generico';
        const uniquenessKey = `${tipo}|${record.timestamp}|${idKey(first.id)}|${idKey(second.id)}`;
        if (emitted.has(uniquenessKey)) continue;
        emitted.add(uniquenessKey);
        results.push({ tipo, monitoradosEncontro: ids, timestamp: record.timestamp,
          posicoes: { [String(first.id)]: { lat: first.latitude, lon: first.longitude }, [String(second.id)]: { lat: second.latitude, lon: second.longitude } },
          distanciaMetros: distance });
      }
    }
    const key = cellKey(record);
    const bucket = cells.get(key) ?? [];
    bucket.push(record); cells.set(key, bucket);
  }
  return results;
}

export async function detect(records: AsyncIterable<PositionRecord>): Promise<Encounter[]> {
  // Timestamp buckets preserve exact-time semantics even when input rows are unsorted.
  const byTimestamp = new Map<string, PositionRecord[]>();
  for await (const record of records) {
    const group = byTimestamp.get(record.timestamp) ?? [];
    group.push(record); byTimestamp.set(record.timestamp, group);
  }
  const result: Encounter[] = [];
  for (const group of byTimestamp.values()) result.push(...detectTimestamp(group));
  return result;
}
