/**
 * Writes src/data/trainers.json from the tracker's Trainers tab.
 *
 * Follower names come from the committed follower snapshot so the
 * also-a-follower flag is resolved once here rather than on every build.
 *
 * Run: npm run snapshot:trainers
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fetchTrainers } from '../src/lib/trainers.ts';
import followers from '../src/data/followers.json' with { type: 'json' };

const sheetId = process.argv[2];
if (!sheetId) {
  console.error('usage: snapshot-trainers.ts <spreadsheetId>');
  process.exit(1);
}

const names = followers.followers.map((f: { name: string }) => f.name);
const data = await fetchTrainers(sheetId, names);
if (!data) {
  console.error('could not read the Trainers tab');
  process.exit(1);
}

await mkdir('src/data', { recursive: true });
await writeFile('src/data/trainers.json', JSON.stringify(data, null, 2) + '\n');

const alsoFollowers = new Set(
  data.trainers.filter((t) => t.isFollower).map((t) => t.name)
).size;

console.log(
  `wrote src/data/trainers.json — ${data.trainers.length} trainer/skill rows, ` +
    `${new Set(data.trainers.map((t) => t.name)).size} people, ` +
    `${data.skills.length} skills, ${alsoFollowers} also followers`
);
