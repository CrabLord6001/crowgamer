/**
 * Reads the Trainers tab of a Skyrim completion tracker at build time.
 *
 * One row per trainer per skill. Where a trainer is also a follower, the two
 * datasets are joined on name: a follower-trainer can be recruited and the
 * training fee looted straight back out of their inventory, which is the only
 * reason the join matters.
 */

import { fetchSheetRows, clean } from './csv';

export type Tier = 'Common' | 'Expert' | 'Master';

export interface Trainer {
  skill: string;
  /** Common trains to 50, Expert to 75, Master to 90. */
  level: string;
  name: string;
  where: string;
  /** Faction membership or quest that gates their services. */
  requirement: string;
  services: string;
  content: string;
  /** True when this trainer also appears on the Followers tab. */
  isFollower: boolean;
}

export interface TrainerData {
  trainers: Trainer[];
  skills: string[];
  levels: string[];
  contents: string[];
  /** The explainer the sheet keeps in its right-hand column. */
  notes: string[];
}

const C = {
  skill: 0,
  level: 1,
  name: 2,
  where: 3,
  requirement: 4,
  services: 5,
  content: 6,
  notes: 8,
};

const TIER_ORDER: Record<string, number> = { Common: 0, Expert: 1, Master: 2 };

export async function fetchTrainers(
  spreadsheetId: string,
  followerNames: string[] = []
): Promise<TrainerData | null> {
  const rows = await fetchSheetRows(spreadsheetId, 'Trainers', 'trainers');
  if (!rows) return null;

  const header = rows.findIndex((r) => clean(r[C.skill]).toLowerCase() === 'skill');
  if (header === -1) {
    console.warn('[trainers] no Skill header row; skipping');
    return null;
  }

  const followers = new Set(followerNames.map((n) => n.toLowerCase()));
  const trainers: Trainer[] = [];
  const notes: string[] = [];

  for (const r of rows.slice(header + 1)) {
    const note = clean(r[C.notes]);
    if (note) notes.push(note);

    const skill = clean(r[C.skill]);
    const name = clean(r[C.name]);
    if (!skill || !name) continue;

    const services = clean(r[C.services]);

    trainers.push({
      skill,
      level: clean(r[C.level]),
      name,
      where: clean(r[C.where]),
      requirement: clean(r[C.requirement]),
      services,
      content: clean(r[C.content]) || 'Base',
      // The sheet's own services column is the first signal; the Followers tab
      // is the check, since a trainer can follow without the column saying so.
      isFollower: /follower/i.test(services) || followers.has(name.toLowerCase()),
    });
  }

  if (!trainers.length) {
    console.warn('[trainers] header found but no rows parsed; skipping');
    return null;
  }

  trainers.sort(
    (a, b) =>
      a.skill.localeCompare(b.skill) ||
      (TIER_ORDER[a.level] ?? 9) - (TIER_ORDER[b.level] ?? 9) ||
      a.name.localeCompare(b.name)
  );

  const skills = [...new Set(trainers.map((t) => t.skill))].sort();
  const levels = [...new Set(trainers.map((t) => t.level).filter(Boolean))].sort(
    (a, b) => (TIER_ORDER[a] ?? 9) - (TIER_ORDER[b] ?? 9)
  );
  const contents = [...new Set(trainers.map((t) => t.content))].sort();

  return { trainers, skills, levels, contents, notes };
}
