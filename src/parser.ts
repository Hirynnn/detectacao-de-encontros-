import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { PersonId, PositionRecord } from './types';

function parseId(raw: string): PersonId {
  const value = raw.trim();
  if (!value) throw new Error('idMonitorado vazio');
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : value;
}

function parseBoolean(raw: string): boolean {
  const v = raw.trim().toLocaleLowerCase();
  if (['true', '1', 'sim', 's', 'yes'].includes(v)) return true;
  if (['false', '0', 'nao', 'não', 'n', 'no', ''].includes(v)) return false;
  throw new Error(`indicador medidaProtetiva inválido: ${raw}`);
}

function parseFields(line: string, lineNumber: number): string[] {
  const fields: string[] = [];
  let value = '';
  let quoted = false;
  let closedQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        value += char;
      }
    } else if (char === ';') {
      fields.push(value.trim());
      value = '';
      closedQuote = false;
    } else if (char === '"' && value.trim() === '' && !closedQuote) {
      quoted = true;
      value = '';
    } else if (closedQuote && char.trim() !== '') {
      throw new Error(`Linha ${lineNumber}: conteúdo após campo entre aspas`);
    } else {
      value += char;
    }
  }

  if (quoted) throw new Error(`Linha ${lineNumber}: campo entre aspas não terminado`);
  fields.push(value.trim());
  return fields;
}

export function parseRow(line: string, lineNumber = 1): PositionRecord | null {
  if (!line.trim()) return null;
  const fields = parseFields(line.replace(/^\uFEFF/, ''), lineNumber);
  if (fields.length < 7) throw new Error(`Linha ${lineNumber}: esperado 7 campos, recebidos ${fields.length}`);
  const [idRaw, factionRaw, timestampRaw, latRaw, lonRaw, protectiveRaw, restrictedRaw] = fields;
  if (lineNumber === 1 && idRaw.trim().toLowerCase() === 'idmonitorado') return null;
  const timestamp = timestampRaw.trim();
  if (!timestamp) throw new Error(`Linha ${lineNumber}: timestamp vazio`);
  const latitude = Number(latRaw.trim()), longitude = Number(lonRaw.trim());
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error(`Linha ${lineNumber}: coordenadas inválidas`);
  }
  const restrictedIds = new Set<PersonId>();
  for (const raw of restrictedRaw.trim().split(/[|,\s]+/).filter(Boolean)) restrictedIds.add(parseId(raw));
  return { id: parseId(idRaw), faction: factionRaw.trim() || null, timestamp, latitude, longitude, protectiveMeasure: parseBoolean(protectiveRaw), restrictedIds };
}

export async function* readRecords(path: string): AsyncGenerator<PositionRecord> {
  const input = createInterface({ input: createReadStream(path, { encoding: 'utf8' }), crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of input) {
    lineNumber++;
    try { const record = parseRow(line, lineNumber); if (record) yield record; }
    catch (error) { throw new Error(`${path}: ${error instanceof Error ? error.message : String(error)}`); }
  }
}
