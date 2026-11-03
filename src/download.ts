import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const base = 'https://bucket-projeto-trainee.s3.sa-east-1.amazonaws.com';
async function main(): Promise<void> {
  await mkdir('datasets/reference', { recursive: true });
  for (let n = 1; n <= 7; n++) {
    const response = await fetch(`${base}/dataset${n}.txt`);
    if (!response.ok) throw new Error(`Download dataset${n} falhou: HTTP ${response.status}`);
    await writeFile(resolve('datasets', `dataset${n}.txt`), Buffer.from(await response.arrayBuffer()));
  }
  for (let n = 1; n <= 2; n++) {
    const response = await fetch(`${base}/respostas${n}.json`);
    if (!response.ok) throw new Error(`Download respostas${n} falhou: HTTP ${response.status}`);
    await writeFile(resolve('datasets/reference', `respostas${n}.json`), Buffer.from(await response.arrayBuffer()));
  }
  console.log('Datasets 1–7 e referências 1–2 baixados.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
