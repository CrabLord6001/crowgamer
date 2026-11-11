# CrowGamer

Game guides, completion notes and tools — [crowgamer.com](https://crowgamer.com).

Astro + React islands, deployed on Vercel.

## Writing a review

Add a `review:` block to a game's markdown. Leave it out and the game page
shows no review section at all — there is no empty state to look at.

```yaml
review:
  verdict: One line. The whole opinion, before any of the detail below.
  score: 8.5            # out of 10; omit to run the review without a number
  played: 120 hours, PC # what you played before judging; optional
  good:
    - Short, one line each
    - These render with a + mark
  bad:
    - And these with a −
  body: >-
    Longer prose, as many paragraphs as you want. Plain text, not markdown —
    blank lines are kept, so paragraphs work.
  updated: 2026-11-11
```

Every field except `verdict` is optional, so a review can be a single line.

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
