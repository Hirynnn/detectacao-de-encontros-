import { mkdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { detect } from './detector';
import { readRecords } from './parser';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileArg = args.find(arg => !arg.startsWith('--'));
  const inputs = fileArg ? [resolve(fileArg)] : Array.from({ length: 7 }, (_, i) => resolve('datasets', `dataset${i + 1}.txt`));
  await mkdir('outputs', { recursive: true });
  for (const input of inputs) {
    const encounters = await detect(readRecords(input));
    const match = basename(input).match(/dataset(\d+)/i);
    const output = resolve('outputs', `respostas${match?.[1] ?? basename(input).replace(/\.[^.]+$/, '')}.json`);
    await writeFile(output, `${JSON.stringify(encounters, null, 2)}\n`, 'utf8');
    console.log(`${input} -> ${output}: ${encounters.length} encontros`);
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
