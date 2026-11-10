/** Shared helpers for reading a link-viewable Google Sheet tab as CSV at build time. */

export function csvUrl(spreadsheetId: string, tab: string) {
  // headers=1 is not optional. Without it gviz guesses how many leading rows are
  // header, and on a tab whose first data rows are mostly text it guesses several
  // and concatenates them into one row — silently losing those ingredients or
  // followers and corrupting the header.
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}`;
}

/** Minimal RFC-4180 parser: handles quoted fields and escaped quotes. */
export function parseCsv(text: string): string[][] {
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

export async function fetchSheetRows(
  spreadsheetId: string,
  tab: string,
  label = tab
): Promise<string[][] | null> {
  try {
    const res = await fetch(csvUrl(spreadsheetId, tab), {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseCsv(await res.text());
  } catch (err) {
    console.warn(
      `[${label}] could not read the sheet (${err instanceof Error ? err.message : err})`
    );
    return null;
  }
}

export const clean = (s: string | undefined) => (s ?? '').trim();
