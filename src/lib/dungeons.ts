/**
 * Reads the Dungeons tab of a Skyrim completion tracker at build time and turns
 * it into the shape the dungeon index island wants.
 *
 * One row per location. The sheet is the source of truth for which locations
 * carry a clear marker, so the counts the page shows are derived here rather
 * than hard-coded — a correction in the sheet reaches the site on next build.
 */

import { fetchSheetRows, clean } from './csv';

export type Marker = 'counts' | 'no-credit' | 'none';

export interface Dungeon {
  name: string;
  hold: string;
  /** Where it is, in the sheet's own words. */
  location: string;
  type: string;
  /** Kept as written rather than split — enemy notes contain their own commas. */
  enemies: string;
  quests: string;
  /** Base | Dawnguard | Hearthfire | Dragonborn */
  content: string;
  cleared: boolean;
  notes: string;
  /**
   * counts    — clearing it advances Dungeons Cleared
   * no-credit — shows a cleared marker but gives no credit
   * none      — never marks cleared
   */
  marker: Marker;
  wordWall: boolean;
}

export interface Facet {
  name: string;
  total: number;
  /** Locations in this facet that carry a counting clear marker. */
  counts: number;
  cleared: number;
}

export interface DungeonData {
  dungeons: Dungeon[];
  holds: Facet[];
  types: string[];
  contents: string[];
  totals: {
    all: number;
    counts: number;
    cleared: number;
    wordWalls: number;
  };
}

const COLS = {
  name: 0,
  hold: 2,
  location: 3,
  type: 4,
  enemies: 5,
  quests: 6,
  content: 7,
  cleared: 8,
  notes: 9,
  marker: 10,
};

/** "Yes — counts" / "Yes — no credit" / "No marker", em dash and all. */
function toMarker(raw: string): Marker {
  const s = raw.toLowerCase();
  if (s.includes('no credit')) return 'no-credit';
  if (s.startsWith('yes')) return 'counts';
  return 'none';
}

export async function fetchDungeons(
  spreadsheetId: string,
  tab = 'Dungeons'
): Promise<DungeonData | null> {
  const rows = await fetchSheetRows(spreadsheetId, tab, 'dungeons');
  if (!rows) return null;

  const headerIdx = rows.findIndex((r) => clean(r[COLS.name]).toLowerCase() === 'dungeon');
  if (headerIdx === -1) {
    console.warn('[dungeons] no Dungeon header row; skipping');
    return null;
  }

  const dungeons: Dungeon[] = [];

  for (const r of rows.slice(headerIdx + 1)) {
    const name = clean(r[COLS.name]);
    if (!name) continue;

    // A location with no hold is a stray row, not a place.
    const hold = clean(r[COLS.hold]);
    if (!hold) continue;

    const notes = clean(r[COLS.notes]);

    dungeons.push({
      name,
      hold,
      location: clean(r[COLS.location]),
      type: clean(r[COLS.type]) || 'Unknown',
      enemies: clean(r[COLS.enemies]),
      quests: clean(r[COLS.quests]),
      content: clean(r[COLS.content]) || 'Base',
      cleared: clean(r[COLS.cleared]).toUpperCase() === 'TRUE',
      notes,
      marker: toMarker(clean(r[COLS.marker])),
      wordWall: notes.toLowerCase().includes('word wall'),
    });
  }

  if (!dungeons.length) {
    console.warn('[dungeons] header found but no location rows parsed; skipping');
    return null;
  }

  dungeons.sort((a, b) => a.name.localeCompare(b.name));

  const byHold = new Map<string, Facet>();
  for (const d of dungeons) {
    const f = byHold.get(d.hold) ?? { name: d.hold, total: 0, counts: 0, cleared: 0 };
    f.total++;
    if (d.marker === 'counts') f.counts++;
    if (d.cleared) f.cleared++;
    byHold.set(d.hold, f);
  }

  // Most locations first: the holds worth planning a trip around lead the list.
  const holds = [...byHold.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name)
  );

  const types = [...new Set(dungeons.map((d) => d.type))].sort((a, b) => a.localeCompare(b));
  const contents = [...new Set(dungeons.map((d) => d.content))].sort((a, b) =>
    // Base first, DLC alphabetical after it.
    a === 'Base' ? -1 : b === 'Base' ? 1 : a.localeCompare(b)
  );

  return {
    dungeons,
    holds,
    types,
    contents,
    totals: {
      all: dungeons.length,
      counts: dungeons.filter((d) => d.marker === 'counts').length,
      cleared: dungeons.filter((d) => d.cleared).length,
      wordWalls: dungeons.filter((d) => d.wordWall).length,
    },
  };
}
