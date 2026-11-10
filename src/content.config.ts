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
    }),
});

export const collections = { games };
