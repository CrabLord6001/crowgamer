# CrowGamer

Game guides, completion notes and tools — [crowgamer.com](https://crowgamer.com).

Astro + React islands, deployed on Vercel.

## Adding a game

Create one markdown file in `src/content/games/`. No code changes.

```md
---
title: Hollow Knight
tagline: Beating every boss in Godhome
genre: Metroidvania
summary: One-line description used on the game page and in search results.
status: in-progress      # completed | in-progress | planned
accent: "#4a9d9c"        # the color this game wears on its own pages
order: 3
tools:
  - name: Boss Checklist
    desc: Every pantheon binding, tracked
    icon: "⚔️"
    route: bosses        # -> /games/hollow-knight/bosses
    ready: false
  - name: Completion Sheet
    desc: Lives in Google Sheets
    icon: "📊"
    href: https://docs.google.com/...   # external link instead of a route
    ready: true
tips:
  - Short, scannable, one line each
---

Longer prose goes here and renders at the bottom of the game page.
```

The schema in `src/content.config.ts` is enforced at build time — a typo or a
missing field fails the build rather than shipping a broken page.

`accent` becomes `--accent` on that game's pages only. Site chrome uses
`--brand`, set once in `src/styles/tokens.css`.

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server with live reload at localhost:4321 |
| `npm run build` | Static build to `dist/` |
| `npm run preview` | Serve the built output |
| `npm run check` | Type-check content and components |
