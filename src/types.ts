export type PersonId = number | string;
export type EncounterType = 'generico' | 'faccao' | 'protetiva';

export interface PositionRecord {
  id: PersonId;
  faction: string | null;
  timestamp: string;
  latitude: number;
  longitude: number;
  protectiveMeasure: boolean;
  restrictedIds: Set<PersonId>;
}

export interface Encounter {
  tipo: EncounterType;
  monitoradosEncontro: [PersonId, PersonId];
  timestamp: string;
  posicoes: Record<string, { lat: number; lon: number }>;
  distanciaMetros: number;
}
