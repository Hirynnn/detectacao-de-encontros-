import test from 'node:test';
import assert from 'node:assert/strict';
import { detectTimestamp } from './detector';
import { haversineMeters } from './haversine';
import { parseRow } from './parser';
import { PositionRecord } from './types';

function record(id: number, latitude: number, longitude: number, extra = ''): PositionRecord {
  return parseRow(`${id};${extra};2024-01-01 00:00:00;${latitude};${longitude};false;`, 2)!;
}

test('Haversine usa raio terrestre especificado e mede distância', () => {
  const zero = record(1, 0, 0), near = record(2, 0, 0.0001);
  assert.ok(haversineMeters(zero, near) > 11 && haversineMeters(zero, near) < 12);
});

test('detector aplica limite estrito de 20 metros', () => {
  const origin = record(1, 0, 0);
  const at19 = record(2, 0, 19 / 111_194.9266);
  const at20 = record(3, 0, 20 / 111_194.9266);
  const at21 = record(4, 0, 21 / 111_194.9266);
  assert.equal(detectTimestamp([origin, at19]).filter(e => e.tipo === 'generico').length, 1);
  assert.equal(detectTimestamp([origin, at20]).filter(e => e.tipo === 'generico').length, 0);
  assert.equal(detectTimestamp([origin, at21]).filter(e => e.tipo === 'generico').length, 0);
});

test('detector encontra posições próximas em latitude brasileira', () => {
  const first = record(1, -23.55, 0.000089);
  const second = record(2, -23.55, 0.000270);
  const encounters = detectTimestamp([first, second]).filter(e => e.tipo === 'generico');
  assert.equal(encounters.length, 1);
  assert.ok(encounters[0].distanciaMetros < 20);
});

test('classifica o encontro na categoria específica sem duplicar o par', () => {
  const victim = parseRow('1;A;2024-01-01 00:00:00;0;0;true;2', 2)!;
  const offender = parseRow('2;A;2024-01-01 00:00:00;0;0.00001;false;', 3)!;
  const results = detectTimestamp([victim, offender]);
  assert.deepEqual(results.map(e => e.tipo), ['protetiva']);
  assert.equal(results.length, 1);
  assert.deepEqual(results[0].monitoradosEncontro, [1, 2]);
});

test('não compara timestamps diferentes (grupos são processados separadamente)', () => {
  const a = record(1, 0, 0);
  const b = { ...record(2, 0, 0), timestamp: '2024-01-01 00:00:01' };
  assert.equal(detectTimestamp([a]).length + detectTimestamp([b]).length, 0);
});

test('parser lida com espaços/campos opcionais e rejeita coordenadas inválidas', () => {
  const parsed = parseRow(' 7 ; ;2024-01-01 00:00:00; -10 ; -37 ; 0 ; ', 2)!;
  assert.equal(parsed.id, 7);
  assert.equal(parsed.faction, null);
  assert.throws(() => parseRow('7;;2024-01-01 00:00:00;91;0;false;', 2), /coordenadas inválidas/);
});

test('parser remove aspas CSV de timestamp e IDs de restrição', () => {
  const parsed = parseRow('9;;"2024-01-01 00:16:45";1.83355;-69.5461;true;"10"', 2)!;
  assert.equal(parsed.timestamp, '2024-01-01 00:16:45');
  assert.equal(parsed.restrictedIds.has(10), true);
});
