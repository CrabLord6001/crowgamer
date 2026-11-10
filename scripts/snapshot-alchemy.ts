/**
 * Writes src/data/alchemy.json from the tracker's Alchemy tab.
 *
 * Ingredient effects are fixed game data, so the committed snapshot is what the
 * site ships; the build still re-reads the sheet so corrections to the "where to
 * find" notes flow through, and falls back here when it can't.
 *
 * Run: node --experimental-strip-types scripts/snapshot-alchemy.ts <sheetId>
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fetchAlchemy } from '../src/lib/alchemy.ts';

const sheetId = process.argv[2];
if (!sheetId) {
  console.error('usage: snapshot-alchemy.ts <spreadsheetId>');
  process.exit(1);
}

const data = await fetchAlchemy(sheetId);
if (!data) {
  console.error('could not read the Alchemy tab');
  process.exit(1);
}

await mkdir('src/data', { recursive: true });
await writeFile('src/data/alchemy.json', JSON.stringify(data, null, 2) + '\n');

console.log(
  `wrote src/data/alchemy.json — ${data.ingredients.length} ingredients, ${data.effects.length} effects`
);
