import { statSync } from 'node:fs';
import { cp, copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'frontend', 'dist');
const destination = path.join(root, 'web');
const indexFile = path.join(source, 'index.html');

if (!(await stat(indexFile).catch(() => null))) {
  throw new Error('frontend/dist/index.html is missing; run the frontend build first.');
}

await rm(path.join(destination, 'assets'), { recursive: true, force: true });
await mkdir(destination, { recursive: true });

for (const name of await readdir(source)) {
  const from = path.join(source, name);
  const to = path.join(destination, name);
  if (name === 'index.html') {
    await copyFile(from, to);
  } else {
    await cp(from, to, {
      recursive: true,
      filter: file => !statSync(file).isFile() || !file.endsWith('.map'),
    });
  }
}

console.log('Synchronized frontend/dist into web/ (source maps omitted).');
