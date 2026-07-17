import type { CollectionEntry } from 'astro:content';

export interface SeriesSummary {
  slug: string;
  title: string;
  description: string;
  status: 'ongoing' | 'complete';
  order: number;
  featured: boolean;
  planned?: number;
  count: number;
  totalMin: number;
  updated: number;
}

/** Reading time estimate in minutes (same heuristic the reading pages use). */
export const readMin = (body?: string) => Math.max(1, Math.round((body?.length || 0) / 1000));

/** Compact duration label: "≈ 2.5H" above an hour, "≈ 40MIN" below. */
export const fmtEst = (min: number) => (min >= 60 ? `≈ ${(min / 60).toFixed(1)}H` : `≈ ${min}MIN`);

/**
 * Joins the series collection with notes into shelf-ready summaries,
 * ordered by the series `order` field. Series without chapters are dropped.
 */
export function buildSeriesList(
  seriesEntries: CollectionEntry<'series'>[],
  allNotes: CollectionEntry<'notes'>[],
): SeriesSummary[] {
  return seriesEntries
    .map((entry) => {
      const chapters = allNotes.filter((n) => n.data.series === entry.id);
      return {
        slug: entry.id,
        title: entry.data.title,
        description: entry.data.description,
        status: entry.data.status,
        order: entry.data.order,
        featured: entry.data.featured,
        planned: entry.data.plannedChapters,
        count: chapters.length,
        totalMin: chapters.reduce((sum, n) => sum + readMin(n.body), 0),
        updated: chapters.reduce((max, n) => Math.max(max, n.data.pubDate.valueOf()), 0),
      };
    })
    .filter((s) => s.count > 0)
    .sort((a, b) => a.order - b.order);
}
