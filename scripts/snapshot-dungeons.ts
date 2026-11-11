/**
 * Writes src/data/dungeons.json from the tracker's Dungeons tab.
 *
 * Which locations exist, what type they are and whether they carry a clear
 * marker is fixed game data, so the committed snapshot is what the site ships.
 * The build still re-reads the sheet so newly cleared locations and edits to the
 * notes flow through, and falls back here when it can't.
 *
 * Run: node --experimental-strip-types scripts/snapshot-dungeons.ts <sheetId>
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fetchDungeons } from '../src/lib/dungeons.ts';

const sheetId = process.argv[2];
if (!sheetId) {
  console.error('usage: snapshot-dungeons.ts <spreadsheetId>');
  process.exit(1);
}

const data = await fetchDungeons(sheetId);
if (!data) {
  console.error('could not read the Dungeons tab');
  process.exit(1);
}

await mkdir('src/data', { recursive: true });
await writeFile('src/data/dungeons.json', JSON.stringify(data, null, 2) + '\n');

console.log(
  `wrote src/data/dungeons.json — ${data.totals.all} locations, ${data.holds.length} holds, ` +
    `${data.totals.counts} that count, ${data.totals.wordWalls} word walls`
);
