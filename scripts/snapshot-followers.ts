/**
 * Writes src/data/followers.json from the tracker's Followers and Marriage tabs.
 * Run: npm run snapshot:followers
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fetchFollowers } from '../src/lib/followers.ts';

const sheetId = process.argv[2];
if (!sheetId) {
  console.error('usage: snapshot-followers.ts <spreadsheetId>');
  process.exit(1);
}

const data = await fetchFollowers(sheetId);
if (!data) {
  console.error('could not read the Followers tab');
  process.exit(1);
}

await mkdir('src/data', { recursive: true });
await writeFile('src/data/followers.json', JSON.stringify(data, null, 2) + '\n');

const withMarriage = data.followers.filter((f) => f.marriage).length;
console.log(
  `wrote src/data/followers.json — ${data.followers.length} followers, ` +
    `${data.types.length} types, ${withMarriage} joined to a Marriage row`
);
