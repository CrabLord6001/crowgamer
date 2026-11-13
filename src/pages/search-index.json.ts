/**
 * The search index, built once at build time and served as a static file.
 *
 * It is fetched lazily the first time the search box is focused rather than
 * shipped with the home page, so a visit that never searches pays nothing for
 * it. Keys are one letter because this is ~540 records and the repetition adds
 * up: t title, k kind, d detail, u url, g game, c the game's accent color.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import dungeons from '../data/dungeons.json';
import alchemy from '../data/alchemy.json';
import followers from '../data/followers.json';
import forge from '../data/forge.json';
import trainers from '../data/trainers.json';

interface Row {
  t: string;
  k: string;
  d: string;
  u: string;
  /** Which game this belongs to. Games themselves carry none — the title is it. */
  g?: string;
  /** That game's accent, so a hit is identifiable by color as well as name. */
  c?: string;
}

export const GET: APIRoute = async () => {
  const rows: Row[] = [];

  const games = (await getCollection('games', ({ data }) => !data.draft)).sort(
    (a, b) => a.data.order - b.data.order
  );

  for (const g of games) {
    rows.push({ t: g.data.title, k: 'Game', d: g.data.tagline, u: `/games/${g.id}/`, c: g.data.accent });
    for (const tool of g.data.tools) {
      if (!tool.ready) continue;
      const url = tool.href ?? (tool.route ? `/games/${g.id}/${tool.route}/` : undefined);
      if (!url) continue;
      rows.push({
        t: tool.name,
        k: 'Tool',
        d: tool.desc,
        u: url,
        g: g.data.title,
        c: g.data.accent,
      });
    }
  }

  // The datasets below are Skyrim's. Take its name and color from the content
  // rather than hard-coding them, so a rename or a recolor carries through —
  // and so adding Oblivion's ingredients later is the same shape of change.
  const skyrim = games.find((g) => g.id === 'skyrim');
  const SK = { g: skyrim?.data.title ?? 'Skyrim', c: skyrim?.data.accent };

  // Everything below lives inside a tool, so a hit links to the tool that holds
  // it. The detail line carries what you would search by after the name.
  for (const d of dungeons.dungeons) {
    rows.push({
      t: d.name,
      k: 'Location',
      d: [d.hold, d.type, d.cleared ? 'cleared' : null].filter(Boolean).join(' · '),
      u: '/games/skyrim/dungeons/',
      ...SK,
    });
  }

  for (const i of alchemy.ingredients) {
    rows.push({
      t: i.name,
      k: 'Ingredient',
      d: i.effects.join(', '),
      u: '/games/skyrim/alchemy/',
      ...SK,
    });
  }

  for (const e of alchemy.effects) {
    rows.push({
      t: e.name,
      k: 'Effect',
      d: `${e.ingredients.length} ingredients`,
      u: '/games/skyrim/alchemy/',
      ...SK,
    });
  }

  for (const f of followers.followers) {
    rows.push({
      t: f.name,
      k: 'Follower',
      d: [f.type, f.skills?.slice(0, 3).join(', ')].filter(Boolean).join(' · '),
      u: '/games/skyrim/followers/',
      ...SK,
    });
  }

  for (const r of forge.recipes) {
    rows.push({
      t: r.output,
      k: 'Forge recipe',
      d: r.inputs,
      u: '/games/skyrim/forge/',
      ...SK,
    });
  }

  for (const t of trainers.trainers) {
    rows.push({
      t: t.name,
      k: 'Trainer',
      d: [`${t.skill} (${t.level})`, t.where].filter(Boolean).join(' · '),
      u: '/games/skyrim/trainers/',
      ...SK,
    });
  }

  return new Response(JSON.stringify({ rows }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
