/**
 * Reads the Alchemy tab of a Skyrim completion tracker at build time and turns
 * it into the shape the lookup island wants.
 *
 * The sheet is one row per ingredient with four effect columns. Everything the
 * tool needs — the effect index, the pair graph — is derived here at build time
 * so the page ships plain data and does no work on load.
 */

import { fetchSheetRows, clean } from './csv';

export interface Ingredient {
  name: string;
  /** Four effects, in the game's slot order. */
  effects: string[];
  value: number;
  weight: number;
  source: string;
  /** Base | Dawnguard | Hearthfire | Dragonborn */
  content: string;
}

export interface AlchemyData {
  ingredients: Ingredient[];
  /** Every effect, sorted, with the ingredient names that carry it. */
  effects: { name: string; ingredients: string[] }[];
}

const COLS = {
  name: 0,
  effect1: 2,
  effect4: 5,
  value: 6,
  weight: 7,
  source: 8,
  content: 9,
};

export async function fetchAlchemy(
  spreadsheetId: string,
  tab = 'Alchemy'
): Promise<AlchemyData | null> {
  const rows = await fetchSheetRows(spreadsheetId, tab, 'alchemy');
  if (!rows) return null;

  const headerIdx = rows.findIndex((r) => clean(r[COLS.name]).toLowerCase() === 'ingredient');
  if (headerIdx === -1) {
    console.warn('[alchemy] no Ingredient header row; skipping');
    return null;
  }

  const ingredients: Ingredient[] = [];

  for (const r of rows.slice(headerIdx + 1)) {
    const name = clean(r[COLS.name]);
    if (!name) continue;

    const effects = r
      .slice(COLS.effect1, COLS.effect4 + 1)
      .map(clean)
      .filter(Boolean);

    // Every real ingredient has four effects. Anything else is a stray row from
    // the lookup widget living to the right of the table.
    if (effects.length !== 4) continue;

    ingredients.push({
      name,
      effects,
      value: Number(clean(r[COLS.value])) || 0,
      weight: Number(clean(r[COLS.weight])) || 0,
      source: clean(r[COLS.source]),
      content: clean(r[COLS.content]) || 'Base',
    });
  }

  if (!ingredients.length) {
    console.warn('[alchemy] header found but no ingredient rows parsed; skipping');
    return null;
  }

  const byEffect = new Map<string, string[]>();
  for (const ing of ingredients) {
    for (const effect of ing.effects) {
      const list = byEffect.get(effect) ?? [];
      list.push(ing.name);
      byEffect.set(effect, list);
    }
  }

  const effects = [...byEffect.entries()]
    .map(([name, list]) => ({ name, ingredients: list.sort() }))
    .sort((a, b) => a.name.localeCompare(b.name));

  ingredients.sort((a, b) => a.name.localeCompare(b.name));

  return { ingredients, effects };
}
