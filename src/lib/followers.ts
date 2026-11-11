/**
 * Reads the Followers and Marriage tabs of a Skyrim tracker at build time and
 * joins them on name.
 *
 * The Followers tab has no Location column — location lives inside the
 * Description prose. The Marriage tab does have one, so marriageable followers
 * get a real location and the rest carry their description as written.
 */

import { fetchSheetRows, clean } from './csv';

export interface Follower {
  name: string;
  /** Faction or how they're classed: College of Winterhold, Dawnguard, Housecarl... */
  type: string;
  description: string;
  /** Quest or deed that unlocks them as a follower */
  recruit: string;
  skills: string[];
  /** Level cap, or null where the sheet says None */
  maxLevel: number | null;
  canMarry: boolean;
  canSteward: boolean;
  canBlades: boolean;
  content: string;
  notes: string;
  /** Where they live, and so where they return to when dismissed. Blank for the
   *  animals, summons and generic NPCs that have no fixed home. */
  location: string;
  /** Male | Female, or blank for animals, constructs and generic NPCs. */
  gender: string;
  /** Present only when they also appear on the Marriage tab */
  marriage?: {
    gender: string;
    race: string;
    location: string;
    property: string;
    merchant: string;
    trainer: string;
    unlock: string;
  };
}

export interface FollowerData {
  followers: Follower[];
  types: string[];
  contents: string[];
  genders: string[];
}

const yes = (s: string) => /^y(es)?$/i.test(clean(s));

const F = {
  name: 0,
  type: 2,
  description: 3,
  recruit: 4,
  skills: 5,
  maxLevel: 6,
  marry: 7,
  steward: 8,
  blades: 9,
  content: 10,
  notes: 11,
  location: 12,
  gender: 13,
};

const M = {
  name: 0,
  gender: 2,
  race: 3,
  location: 4,
  property: 5,
  alsoFollower: 6,
  merchant: 7,
  trainer: 8,
  unlock: 9,
};

export async function fetchFollowers(
  spreadsheetId: string
): Promise<FollowerData | null> {
  const [followerRows, marriageRows] = await Promise.all([
    fetchSheetRows(spreadsheetId, 'Followers', 'followers'),
    fetchSheetRows(spreadsheetId, 'Marriage', 'marriage'),
  ]);

  if (!followerRows) return null;

  // Marriage rows keyed by name, so followers can pick up a real location.
  const marriage = new Map<string, Follower['marriage']>();
  if (marriageRows) {
    const mHeader = marriageRows.findIndex(
      (r) => clean(r[M.name]).toLowerCase() === 'name'
    );
    for (const r of marriageRows.slice(mHeader + 1)) {
      const name = clean(r[M.name]);
      if (!name) continue;
      marriage.set(name.toLowerCase(), {
        gender: clean(r[M.gender]),
        race: clean(r[M.race]),
        location: clean(r[M.location]),
        property: clean(r[M.property]),
        merchant: clean(r[M.merchant]),
        trainer: clean(r[M.trainer]),
        unlock: clean(r[M.unlock]),
      });
    }
  }

  const header = followerRows.findIndex(
    (r) => clean(r[F.name]).toLowerCase() === 'follower'
  );
  if (header === -1) {
    console.warn('[followers] no Follower header row; skipping');
    return null;
  }

  const followers: Follower[] = [];

  for (const r of followerRows.slice(header + 1)) {
    const name = clean(r[F.name]);
    if (!name) continue;

    const rawMax = clean(r[F.maxLevel]);
    const maxLevel = /^\d+$/.test(rawMax) ? Number(rawMax) : null;

    followers.push({
      name,
      type: clean(r[F.type]) || 'Other',
      description: clean(r[F.description]),
      recruit: clean(r[F.recruit]),
      skills: clean(r[F.skills])
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      maxLevel,
      canMarry: yes(r[F.marry]),
      canSteward: yes(r[F.steward]),
      canBlades: yes(r[F.blades]),
      content: clean(r[F.content]) || 'Base',
      notes: clean(r[F.notes]),
      location: clean(r[F.location]),
      gender: clean(r[F.gender]),
      marriage: marriage.get(name.toLowerCase()),
    });
  }

  if (!followers.length) {
    console.warn('[followers] header found but no rows parsed; skipping');
    return null;
  }

  followers.sort((a, b) => a.name.localeCompare(b.name));

  const types = [...new Set(followers.map((f) => f.type))].sort();
  const genders = [...new Set(followers.map((f) => f.gender).filter(Boolean))].sort();
  const contents = [...new Set(followers.map((f) => f.content))].sort();

  return { followers, types, contents, genders };
}
