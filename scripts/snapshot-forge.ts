/**
 * Writes src/data/forge.json from the tracker's Forge tab.
 *
 * Forge recipes are fixed game data, so the committed snapshot is what the
 * site ships; the build still re-reads the sheet so corrections to the "where to
 * find" notes flow through, and falls back here when it can't.
 *
 * Run: node --experimental-strip-types scripts/snapshot-forge.ts <sheetId>
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fetchForge } from '../src/lib/forge.ts';

const sheetId = process.argv[2];
if (!sheetId) {
  console.error('usage: snapshot-forge.ts <spreadsheetId>');
  process.exit(1);
}

const data = await fetchForge(sheetId);
if (!data) {
  console.error('could not read the Atronach Forge tab');
  process.exit(1);
}

await mkdir('src/data', { recursive: true });
await writeFile('src/data/forge.json', JSON.stringify(data, null, 2) + '\n');

const resolvable = data.recipes.filter((r) => r.priority !== null).length;
console.log(
  `wrote src/data/forge.json — ${data.recipes.length} recipes ` +
    `(${resolvable} with a priority), ${data.ingredients.length} distinct ingredients`
);
