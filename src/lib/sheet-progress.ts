/**
 * Reads a completion tracker's Progress tab at build time.
 *
 * A Google Sheet set to "anyone with the link can view" serves CSV from the
 * gviz endpoint with no credentials and no "publish to web" step, so there is
 * nothing to keep in sync and no secret in the repo.
 *
 * Rows are located by their label, not by index, so inserting rows in the sheet
 * doesn't break the build. If the fetch fails the caller falls back to the
 * snapshot in frontmatter — a Google outage must not fail a deploy.
 */

export interface SheetProgress {
  overall: number;
  trackers: { label: string; done: number; total: number }[];
  breakdown: { name: string; done: number; total: number }[];
  notes: { label: string; value: string }[];
  fetchedAt: Date;
}

export function csvUrl(spreadsheetId: string, tab = 'Progress') {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
}

/** Minimal RFC-4180 parser: handles quoted fields and escaped quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const clean = (s: string | undefined) => (s ?? '').trim();
const num = (s: string | undefined) => {
  const n = parseFloat(clean(s).replace(/[%,]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const TRACKERS = [
  'Locations cleared',
  'Achievements unlocked',
  'Quests completed',
  'Collectibles found',
  'Shout words learned',
];

const NOTES: { label: string; match: string }[] = [
  { label: 'Toward Delver (50)', match: 'Counted toward Delver' },
  { label: 'Locations remaining', match: 'Remaining' },
];

export async function fetchProgress(
  spreadsheetId: string,
  tab = 'Progress'
): Promise<SheetProgress | null> {
  let rows: string[][];

  try {
    const res = await fetch(csvUrl(spreadsheetId, tab), {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    rows = parseCsv(await res.text());
  } catch (err) {
    console.warn(
      `[progress] could not read the tracker (${err instanceof Error ? err.message : err}); using the frontmatter snapshot`
    );
    return null;
  }

  const find = (label: string) =>
    rows.find((r) => clean(r[0]).toLowerCase().startsWith(label.toLowerCase()));

  const overallRow = find('OVERALL COMPLETION');
  if (!overallRow) {
    console.warn('[progress] no OVERALL COMPLETION row; using the snapshot');
    return null;
  }

  const trackers = TRACKERS.map((label) => {
    const r = find(label);
    return r ? { label, done: num(r[1]), total: num(r[2]) } : null;
  }).filter((t): t is NonNullable<typeof t> => t !== null && t.total > 0);

  // The hold table is whatever follows the "Hold / Region" header row.
  const headerIdx = rows.findIndex((r) => clean(r[0]).startsWith('Hold / Region'));
  const breakdown: SheetProgress['breakdown'] = [];
  if (headerIdx !== -1) {
    for (const r of rows.slice(headerIdx + 1)) {
      const name = clean(r[0]);
      if (!name) break;
      breakdown.push({ name, done: num(r[2]), total: num(r[1]) });
    }
    breakdown.sort((a, b) => b.done / (b.total || 1) - a.done / (a.total || 1));
  }

  const notes = NOTES.map(({ label, match }) => {
    const r = find(match);
    return r ? { label, value: clean(r[1]) } : null;
  }).filter((n): n is NonNullable<typeof n> => n !== null);

  const wallsTotal = find('Dungeons with a word wall');
  const wallsDone = find('Word wall dungeons cleared');
  if (wallsTotal && wallsDone) {
    notes.unshift({
      label: 'Word walls cleared',
      value: `${clean(wallsDone[1])} / ${clean(wallsTotal[1])}`,
    });
  }

  return {
    overall: num(overallRow[1]),
    trackers,
    breakdown,
    notes,
    fetchedAt: new Date(),
  };
}
