/**
 * Links out to UESP, the Elder Scrolls wiki.
 *
 * Kept in its own module rather than in dungeons.ts so the client island can
 * import it without dragging the build-time sheet reader into the bundle.
 */

/**
 * UESP splits Solstheim into a Dragonborn namespace and keeps everything else
 * under Skyrim — Dawnguard locations included, despite being DLC. Checked
 * against their API for all 298 locations in the tracker: the sheet's content
 * column alone decides the namespace, with no exceptions.
 */
const EXCEPTIONS: Record<string, string> = {
  // These two pages are titled with odd capitalization on UESP ("Wreck Of The
  // Brinehammer"), which an editor may well fix. Point at the redirects, which
  // survive a retitle.
  'Wreck of the Brinehammer': 'Skyrim:Brinehammer',
  'Wreck of the Pride of Tel Vos': 'Skyrim:Pride of Tel Vos',
};

/** The wiki page for a tracked location. `content` is the sheet's own column. */
export function uespUrl(name: string, content: string): string {
  const title = EXCEPTIONS[name] ?? `${content === 'Dragonborn' ? 'Dragonborn' : 'Skyrim'}:${name}`;
  // encodeURI, not encodeURIComponent: the namespace colon is part of the path.
  return `https://en.uesp.net/wiki/${encodeURI(title.replace(/ /g, '_'))}`;
}
