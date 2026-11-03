import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { detect } from './detector';
import { readRecords } from './parser';
import { Encounter, PersonId } from './types';

const idKey = (id: PersonId) => `${typeof id}:${String(id)}`;
function key(e: Encounter): string {
  const ids = e.monitoradosEncontro.map(idKey).sort();
  return `${e.tipo}|${e.timestamp}|${ids.join('|')}`;
}

async function main(): Promise<void> {
  for (const n of [1, 2]) {
    const start = performance.now();
    const found = await detect(readRecords(resolve('datasets', `dataset${n}.txt`)));
    const expected = JSON.parse(await readFile(resolve('datasets/reference', `respostas${n}.json`), 'utf8')) as Encounter[];
    const expectedKeys = new Set(expected.map(key)), foundKeys = new Set(found.map(key));
    const tp = [...foundKeys].filter(k => expectedKeys.has(k)).length;
    const fp = foundKeys.size - tp, fn = expectedKeys.size - tp;
    const f1 = 2 * tp + fp + fn === 0 ? 1 : 2 * tp / (2 * tp + fp + fn);
    const byKey = new Map(found.map(e => [key(e), e]));
    let positionMismatches = 0, distanceMismatches = 0;
    for (const expectedEncounter of expected) {
      const actual = byKey.get(key(expectedEncounter));
      if (!actual) continue;
      for (const id of expectedEncounter.monitoradosEncontro) {
        const expectedPosition = expectedEncounter.posicoes[String(id)];
        const actualPosition = actual.posicoes[String(id)];
        if (!expectedPosition || !actualPosition || expectedPosition.lat !== actualPosition.lat || expectedPosition.lon !== actualPosition.lon) positionMismatches++;
      }
      if (Math.abs(expectedEncounter.distanciaMetros - actual.distanciaMetros) > 1e-9) distanceMismatches++;
    }
    console.log(JSON.stringify({ dataset: n, expected: expected.length, found: found.length, truePositives: tp, falsePositives: fp, falseNegatives: fn, duplicateKeys: found.length - foundKeys.size, positionMismatches, distanceMismatches, f1, elapsedMs: Number((performance.now() - start).toFixed(2)) }, null, 2));
    if (fp || fn) {
      console.log('Divergências (chaves tipo/timestamp/IDs):');
      for (const k of foundKeys) if (!expectedKeys.has(k)) console.log(`FP ${k}`);
      for (const k of expectedKeys) if (!foundKeys.has(k)) console.log(`FN ${k}`);
    }
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
