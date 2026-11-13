/**
 * Reads the Atronach Forge tab of a Skyrim completion tracker at build time.
 *
 * The column that matters is Priority. The forge resolves whatever is in the
 * offering box to the LOWEST priority recipe it can satisfy, so ingredients
 * that happen to satisfy two recipes produce the wrong one — and a Daedra
 * Heart with it. Everything here exists to make that resolvable.
 */

import { fetchSheetRows, clean } from './csv';

export interface Recipe {
  /** What comes out */
  output: string;
  /** The input line exactly as the sheet writes it */
  inputs: string;
  /** Each input slot; a slot with alternatives holds all of them */
  slots: { options: string[] }[];
  needsSigil: boolean;
  /** Lower wins when two recipes are both satisfied. Null for Creation Club. */
  priority: number | null;
  /** Item value minus its cheapest ingredients. Null where the sheet says Varies. */
  valueGain: number | null;
  varies: boolean;
  content: string;
  notes: string;
}

export interface ForgeData {
  recipes: Recipe[];
  contents: string[];
  /** Every distinct ingredient across every slot, sorted. */
  ingredients: string[];
  /** The explainer the sheet keeps in its right-hand column. */
  howItWorks: string[];
}

/** A recipe is satisfied when every slot has at least one of its options present. */
export function satisfies(recipe: Recipe, have: Set<string>): boolean {
  return recipe.slots.every((slot) => slot.options.some((o) => have.has(o)));
}

export interface Resolution {
  /** What the forge actually produces, or null if nothing matches. */
  result: Recipe | null;
  /** Everything the offering satisfies, lowest priority first. */
  matched: Recipe[];
  /** Satisfied recipes the winner beats — the ones you wanted but won't get. */
  shadowed: Recipe[];
}

/**
 * Work out what the forge makes from a given offering.
 *
 * It produces the lowest-priority recipe it can satisfy, so an offering that
 * covers two recipes silently yields the wrong one. Recipes with no priority
 * (Creation Club) can only win when nothing priced beats them.
 */
export function resolve(recipes: Recipe[], have: Set<string>): Resolution {
  const matched = recipes
    .filter((r) => satisfies(r, have))
    .sort((a, b) => {
      if (a.priority === null && b.priority === null) return a.output.localeCompare(b.output);
      if (a.priority === null) return 1;
      if (b.priority === null) return -1;
      return a.priority - b.priority;
    });

  return { result: matched[0] ?? null, matched, shadowed: matched.slice(1) };
}

const C = {
  output: 0,
  inputs: 1,
  sigil: 2,
  priority: 3,
  value: 4,
  content: 5,
  notes: 6,
  how: 8,
};

/**
 * "Fire Salts + Broom + Corundum Ore or Corundum Ingot + Greater Soul Gem or
 * Grand Soul Gem" becomes three slots, the third holding two options.
 *
 * Split on " + " for slots and " or " for alternatives within a slot. A
 * parenthesised aside is dropped: it qualifies the slot rather than naming a
 * different item.
 */
export function parseSlots(inputs: string): { options: string[] }[] {
  const slots: { options: string[] }[] = [];

  for (const part of inputs.split('+')) {
    // A parenthetical that lists alternatives IS the slot's options — "Raw Meat
    // (Dog Meat or Mammoth Snout or ...)" names five real items, and dropping it
    // would leave "Raw Meat", which is not something you can carry. A
    // parenthetical without alternatives only qualifies the slot ("(any size)",
    // "(filled)") and is discarded.
    const paren = part.match(/\(([^)]*)\)/);
    const enumerated = paren && /\bor\b/i.test(paren[1]);
    const text = enumerated ? paren[1] : part.replace(/\([^)]*\)/g, ' ');

    let options = text
      .split(/\bor\b/i)
      .map((o) => clean(o))
      .filter(Boolean);

    // "a second Raw Meat" repeats the slot before it rather than naming an item.
    const repeat = options.length === 1 && /^an?\s+second\s+/i.test(options[0]);
    if (repeat && slots.length) {
      options = [...slots[slots.length - 1].options];
    }

    if (options.length) slots.push({ options });
  }

  return slots;
}

export async function fetchForge(
  spreadsheetId: string,
  tab = 'Atronach Forge'
): Promise<ForgeData | null> {
  const rows = await fetchSheetRows(spreadsheetId, tab, 'forge');
  if (!rows) return null;

  const header = rows.findIndex((r) =>
    clean(r[C.output]).toLowerCase().startsWith('what you get')
  );
  if (header === -1) {
    console.warn('[forge] no header row; skipping');
    return null;
  }

  const recipes: Recipe[] = [];
  const howItWorks: string[] = [];

  for (const r of rows.slice(header + 1)) {
    const how = clean(r[C.how]);
    if (how) howItWorks.push(how);

    const output = clean(r[C.output]);
    const inputs = clean(r[C.inputs]);
    if (!output || !inputs) continue;

    const rawValue = clean(r[C.value]);
    const varies = /varies/i.test(rawValue);
    const rawPriority = clean(r[C.priority]);

    recipes.push({
      output,
      inputs,
      slots: parseSlots(inputs),
      needsSigil: /^y(es)?$/i.test(clean(r[C.sigil])),
      priority: /^\d+$/.test(rawPriority) ? Number(rawPriority) : null,
      valueGain: !varies && /^-?[\d,]+$/.test(rawValue)
        ? Number(rawValue.replace(/,/g, ''))
        : null,
      varies,
      content: clean(r[C.content]) || 'Base',
      notes: clean(r[C.notes]),
    });
  }

  if (!recipes.length) {
    console.warn('[forge] header found but no recipe rows parsed; skipping');
    return null;
  }

  // Priority order is the forge's own order, so it is the default.
  recipes.sort((a, b) => {
    if (a.priority === null && b.priority === null) return a.output.localeCompare(b.output);
    if (a.priority === null) return 1;
    if (b.priority === null) return -1;
    return a.priority - b.priority;
  });

  const ingredients = [
    ...new Set(recipes.flatMap((r) => r.slots.flatMap((s) => s.options))),
  ].sort((a, b) => a.localeCompare(b));

  const contents = [...new Set(recipes.map((r) => r.content))].sort();

  return { recipes, contents, ingredients, howItWorks };
}
