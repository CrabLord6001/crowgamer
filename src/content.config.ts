import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const games = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/games' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      tagline: z.string(),
      genre: z.string(),
      summary: z.string(),

      /** completed | in-progress | planned — drives the badge on the card */
      status: z.enum(['completed', 'in-progress', 'planned']).default('planned'),
      /** 0-100; omit if you aren't tracking completion for this game */
      completion: z.number().min(0).max(100).optional(),
      hours: z.string().optional(),

      /** Hex color this game wears. Becomes --accent on its own pages only. */
      accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'accent must be a #rrggbb hex color'),
      logo: image().optional(),

      /** Sort order on the lander; lower comes first. */
      order: z.number().default(100),
      draft: z.boolean().default(false),

      tools: z
        .array(
          z.object({
            name: z.string(),
            desc: z.string(),
            icon: z.string(),
            /** Path relative to the game, e.g. "planner" -> /games/<slug>/planner */
            route: z.string().optional(),
            /** External destination instead of a route — e.g. a Google Sheet */
            href: z.string().url().optional(),
            ready: z.boolean().default(false),
          })
        )
        .default([]),

      tips: z.array(z.string()).default([]),

      /** Call to action shown under the progress block. */
      cta: z
        .object({
          heading: z.string(),
          body: z.string(),
          button: z.string(),
          href: z.string().url(),
        })
        .optional(),

      /** Snapshot of completion progress. Omit for games you aren't tracking. */
      progress: z
        .object({
          /** When the snapshot below was last read off the tracker by hand */
          updated: z.coerce.date(),
          source: z.string().url().optional(),
          /**
           * Google Sheet id. When set, the build reads live numbers from this
           * sheet's Progress tab and the values below are only a fallback.
           * The sheet needs "anyone with the link can view" — nothing more.
           */
          sheetId: z.string().optional(),
          sheetTab: z.string().default('Progress'),
          /** Headline percentage, 0-100 */
          overall: z.number().min(0).max(100),
          trackers: z
            .array(
              z.object({
                label: z.string(),
                done: z.number(),
                total: z.number(),
              })
            )
            .default([]),
          /** Optional second breakdown, e.g. by region */
          breakdownLabel: z.string().optional(),
          breakdown: z
            .array(
              z.object({
                name: z.string(),
                done: z.number(),
                total: z.number(),
              })
            )
            .default([]),
          notes: z
            .array(z.object({ label: z.string(), value: z.string() }))
            .default([]),
        })
        .optional(),
    }),
});

export const collections = { games };
